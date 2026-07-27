import { createClient } from 'npm:@supabase/supabase-js@2'
import { CORS_HEADERS, handleCorsPreflight } from '../_shared/cors.ts'
import { checkImportReadiness } from '../../../src/lib/orders/importReadiness.ts'
import type { OrderRow } from '../../../src/lib/emails/types.ts'

const ELIGIBLE_STATUSES = ['needs_validation', 'ready_to_import', 'import_failed']
const DEFAULT_CONFIDENCE_THRESHOLD = 0.85

interface SubmitOrderPayload {
  order_id: string
  // Testing-only hook for the stubbed external call below — remove once a
  // real outbound HTTP call replaces the stub, since there's no way to
  // otherwise exercise the failure branch (import_failed, retry) deterministically.
  force_failure?: boolean
}

function serviceClient() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  let payload: SubmitOrderPayload
  try {
    payload = await req.json()
  } catch {
    return jsonResponse({ error: 'invalid payload' }, 400)
  }

  if (!payload.order_id) {
    return jsonResponse({ error: 'order_id is required' }, 400)
  }

  const supabase = serviceClient()
  // Only true once orders.status has actually moved past its starting
  // state — guards the catch-all writeback below from marking an order
  // import_failed over an auth/lookup error that never touched it.
  let pipelineStarted = false

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace(/^Bearer\s+/i, '')

    const { data: userData, error: userError } = await supabase.auth.getUser(token)
    if (userError || !userData?.user) {
      return jsonResponse({ error: 'unauthorized' }, 401)
    }
    const userId = userData.user.id

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('active')
      .eq('id', userId)
      .maybeSingle()
    if (profileError) throw new Error(profileError.message)
    if (!profile?.active) {
      return jsonResponse({ error: 'forbidden' }, 403)
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(
        `id, status, client_order_number, client_name, pickup_address, pickup_at,
         delivery_address, delivery_at, cargo_type, quantity, quantity_unit,
         weight_kg, volume_m3, transport_amount, currency, carrier_proposed, notes,
         order_field_sources (field_name, source_type, source_ref, confidence, created_at)`,
      )
      .eq('id', payload.order_id)
      .maybeSingle()
    if (orderError) throw new Error(orderError.message)
    if (!order) {
      return jsonResponse({ error: 'order not found' }, 404)
    }

    if (!ELIGIBLE_STATUSES.includes(order.status)) {
      return jsonResponse({ error: `order status '${order.status}' is not eligible for submission` }, 409)
    }

    const { data: thresholdSetting } = await supabase
      .from('app_settings')
      .select('value_json')
      .eq('key', 'confidence_threshold')
      .maybeSingle()
    const confidenceThreshold =
      (thresholdSetting?.value_json as { threshold?: number } | null)?.threshold ?? DEFAULT_CONFIDENCE_THRESHOLD

    const readiness = checkImportReadiness(order as unknown as OrderRow, confidenceThreshold)
    if (!readiness.ready) {
      return jsonResponse(
        {
          error: 'order data is not valid for import',
          missing_required_fields: readiness.missingRequiredFields,
          low_confidence_fields: readiness.lowConfidenceFields,
        },
        409,
      )
    }

    const { data: inFlightJob, error: inFlightError } = await supabase
      .from('submission_jobs')
      .select('id')
      .eq('order_id', order.id)
      .in('status', ['pending', 'sent'])
      .maybeSingle()
    if (inFlightError) throw new Error(inFlightError.message)
    if (inFlightJob) {
      return jsonResponse({ error: 'a submission is already in progress for this order' }, 409)
    }

    const { error: readyError } = await supabase
      .from('orders')
      .update({ status: 'ready_to_import', updated_by: userId })
      .eq('id', order.id)
    if (readyError) throw new Error(readyError.message)
    pipelineStarted = true

    const outboundPayload = {
      client_order_number: order.client_order_number,
      client_name: order.client_name,
      pickup_address: order.pickup_address,
      pickup_at: order.pickup_at,
      delivery_address: order.delivery_address,
      delivery_at: order.delivery_at,
      cargo_type: order.cargo_type,
      quantity: order.quantity,
      quantity_unit: order.quantity_unit,
      weight_kg: order.weight_kg,
      volume_m3: order.volume_m3,
      transport_amount: order.transport_amount,
      currency: order.currency,
      carrier_proposed: order.carrier_proposed,
      notes: order.notes,
    }

    const { data: job, error: insertJobError } = await supabase
      .from('submission_jobs')
      .insert({ order_id: order.id, mode: 'manual', status: 'pending', request: outboundPayload })
      .select('id')
      .single()
    if (insertJobError) {
      // 23505 = unique_violation — the partial unique index on
      // submission_jobs(order_id) caught a race the check above missed.
      if (insertJobError.code === '23505') {
        return jsonResponse({ error: 'a submission is already in progress for this order' }, 409)
      }
      throw new Error(insertJobError.message)
    }

    const { error: sentError } = await supabase.from('submission_jobs').update({ status: 'sent' }).eq('id', job.id)
    if (sentError) throw new Error(sentError.message)
    const { error: importingError } = await supabase
      .from('orders')
      .update({ status: 'importing' })
      .eq('id', order.id)
    if (importingError) throw new Error(importingError.message)

    // Outbound API is configurable per docs/DECISIONS.md, non-secret config
    // lives in app_settings, and the credential lives only as an Edge
    // Function secret — both read here so the plumbing is exercised, but no
    // real HTTP call is made yet (see submit-order's plan: stubbed this
    // phase pending an approved outbound target).
    await supabase.from('app_settings').select('value_json').eq('key', 'outbound_api').maybeSingle()
    void Deno.env.get('OUTBOUND_API_KEY')

    if (payload.force_failure) {
      throw new Error('stubbed outbound submission failure (force_failure)')
    }

    const externalId = `STUB-${crypto.randomUUID()}`

    const { error: succeededJobError } = await supabase
      .from('submission_jobs')
      .update({ status: 'succeeded', response: { external_id: externalId }, external_id: externalId })
      .eq('id', job.id)
    if (succeededJobError) throw new Error(succeededJobError.message)

    const { error: importedError } = await supabase
      .from('orders')
      .update({ status: 'imported', external_reference_id: externalId, updated_by: userId })
      .eq('id', order.id)
    if (importedError) throw new Error(importedError.message)

    await supabase.from('order_events').insert({
      order_id: order.id,
      event_type: 'order_submitted',
      payload: { submission_job_id: job.id, external_id: externalId },
      user_id: userId,
    })

    return jsonResponse({ status: 'imported', external_id: externalId }, 200)
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error('submit-order error:', errorMessage)

    // Best-effort failure write-back — only once the pipeline actually
    // touched the order, so an auth/lookup error never marks it import_failed.
    if (pipelineStarted) {
      try {
        await supabase
          .from('submission_jobs')
          .update({ status: 'failed', error: errorMessage })
          .eq('order_id', payload.order_id)
          .in('status', ['pending', 'sent'])
        await supabase.from('orders').update({ status: 'import_failed' }).eq('id', payload.order_id)
        await supabase.from('order_events').insert({
          order_id: payload.order_id,
          event_type: 'order_submission_failed',
          payload: { error: errorMessage },
        })
      } catch (writebackErr) {
        console.error('submit-order failure writeback error:', (writebackErr as Error).message)
      }
    }

    return jsonResponse({ error: errorMessage }, 502)
  }
})
