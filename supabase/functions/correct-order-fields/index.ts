import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { CORS_HEADERS, handleCorsPreflight } from '../_shared/cors.ts'
import { ORDER_FIELD_SECTIONS } from '../../../src/lib/orders/orderFields.ts'

const CORRECTABLE_STATUSES = ['draft', 'needs_validation', 'ready_to_import', 'import_failed']

// Correctable fields = every field ORDER_FIELD_SECTIONS tracks confidence
// for (excludes external_reference_id, submission metadata rather than an
// extracted field) — reused from the same source of truth the UI already
// renders from, rather than duplicating the field list here.
const CORRECTABLE_FIELDS = new Map(
  ORDER_FIELD_SECTIONS.flatMap((section) => section.fields)
    .filter((field) => field.trackConfidence !== false && field.inputType)
    .map((field) => [field.fieldName, field.inputType!]),
)

interface CorrectOrderFieldsPayload {
  order_id: string
  corrections: Record<string, string>
}

function serviceClient(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

/** Converts a raw string input value to the column's actual type, or throws on an invalid value. */
function coerceValue(fieldName: string, inputType: string, raw: string): string | number | null {
  const trimmed = raw.trim()
  if (trimmed === '') return null

  if (inputType === 'number') {
    const num = Number(trimmed)
    if (Number.isNaN(num)) throw new Error(`${fieldName}: '${raw}' is not a valid number`)
    return num
  }

  if (inputType === 'datetime') {
    const date = new Date(trimmed)
    if (Number.isNaN(date.getTime())) throw new Error(`${fieldName}: '${raw}' is not a valid date/time`)
    return date.toISOString()
  }

  return trimmed
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  let payload: CorrectOrderFieldsPayload
  try {
    payload = await req.json()
  } catch {
    return jsonResponse({ error: 'invalid payload' }, 400)
  }

  if (!payload.order_id || !payload.corrections || Object.keys(payload.corrections).length === 0) {
    return jsonResponse({ error: 'order_id and at least one correction are required' }, 400)
  }

  for (const fieldName of Object.keys(payload.corrections)) {
    if (!CORRECTABLE_FIELDS.has(fieldName)) {
      return jsonResponse({ error: `field '${fieldName}' is not correctable` }, 400)
    }
  }

  const supabase = serviceClient()

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

    const fieldNames = Object.keys(payload.corrections)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`id, status, ${fieldNames.join(', ')}`)
      .eq('id', payload.order_id)
      .maybeSingle()
    if (orderError) throw new Error(orderError.message)
    if (!order) {
      return jsonResponse({ error: 'order not found' }, 404)
    }
    if (!CORRECTABLE_STATUSES.includes(order.status)) {
      return jsonResponse({ error: `order status '${order.status}' cannot be corrected` }, 409)
    }

    const columnUpdates: Record<string, string | number | null> = {}
    const oldData: Record<string, unknown> = {}
    const newData: Record<string, unknown> = {}

    for (const fieldName of fieldNames) {
      const inputType = CORRECTABLE_FIELDS.get(fieldName)!
      let coerced: string | number | null
      try {
        coerced = coerceValue(fieldName, inputType, payload.corrections[fieldName])
      } catch (coerceErr) {
        return jsonResponse({ error: (coerceErr as Error).message }, 400)
      }
      columnUpdates[fieldName] = coerced
      oldData[fieldName] = (order as Record<string, unknown>)[fieldName]
      newData[fieldName] = coerced
    }

    // Single UPDATE covering every changed column, and a single multi-row
    // INSERT covering every changed field — each write is atomic on its
    // own (no per-field looping), matching process-email-job's
    // fieldSources insert pattern. No DB transaction wraps the two
    // together; if the update succeeds but the insert below fails, the
    // orders row is already corrected but its order_field_sources
    // wouldn't reflect that — so that failure must surface as a real
    // error to the caller (not swallowed), never reported as success.
    const { error: updateError } = await supabase.from('orders').update(columnUpdates).eq('id', payload.order_id)
    if (updateError) throw new Error(updateError.message)

    const { error: sourcesError } = await supabase.from('order_field_sources').insert(
      fieldNames.map((fieldName) => ({
        order_id: payload.order_id,
        field_name: fieldName,
        source_type: 'manual',
        source_ref: null,
        confidence: 1,
      })),
    )
    if (sourcesError) {
      throw new Error(
        `orders row was updated but order_field_sources insert failed — correction is INCOMPLETE: ${sourcesError.message}`,
      )
    }

    try {
      await supabase.from('audit_logs').insert({
        actor_id: userId,
        action: 'correct',
        entity: 'orders',
        entity_id: payload.order_id,
        old_data: oldData,
        new_data: newData,
      })
    } catch (auditErr) {
      console.error('correct-order-fields audit log error:', (auditErr as Error).message)
    }

    return jsonResponse({ status: 'corrected', fields: fieldNames }, 200)
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error('correct-order-fields error:', errorMessage)
    return jsonResponse({ error: errorMessage }, 500)
  }
})
