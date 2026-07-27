import { createClient } from 'npm:@supabase/supabase-js@2'
import { CORS_HEADERS, handleCorsPreflight } from '../_shared/cors.ts'
import { FUNCTION_BASE_URL } from '../_shared/config.ts'

// Same set ActionBar.tsx / reject-email use for "not yet imported" — these
// are the rows safe to delete and recreate via a fresh process-email-job run.
const PRE_IMPORT_STATUSES = ['draft', 'needs_validation', 'ready_to_import', 'import_failed']

interface RetryExtractionPayload {
  email_id: string
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

  let payload: RetryExtractionPayload
  try {
    payload = await req.json()
  } catch {
    return jsonResponse({ error: 'invalid payload' }, 400)
  }

  if (!payload.email_id) {
    return jsonResponse({ error: 'email_id is required' }, 400)
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

    const { data: email, error: emailError } = await supabase
      .from('emails')
      .select('id, status')
      .eq('id', payload.email_id)
      .maybeSingle()
    if (emailError) throw new Error(emailError.message)
    if (!email) {
      return jsonResponse({ error: 'email not found' }, 404)
    }

    const { data: latestJob, error: latestJobError } = await supabase
      .from('extraction_jobs')
      .select('id, status')
      .eq('email_id', payload.email_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (latestJobError) throw new Error(latestJobError.message)

    if (!latestJob || latestJob.status !== 'failed') {
      return jsonResponse({ error: 'email has no failed extraction job to retry' }, 409)
    }

    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, status')
      .eq('email_id', payload.email_id)
    if (ordersError) throw new Error(ordersError.message)

    const hasSubmittedOrder = (orders ?? []).some((order) => order.status === 'imported' || order.status === 'importing')
    if (hasSubmittedOrder) {
      return jsonResponse({ error: 'email already has an imported/importing order — cannot retry' }, 409)
    }

    const preImportOrderIds = (orders ?? [])
      .filter((order) => PRE_IMPORT_STATUSES.includes(order.status))
      .map((order) => order.id)

    if (preImportOrderIds.length > 0) {
      const { error: deleteError } = await supabase.from('orders').delete().in('id', preImportOrderIds)
      if (deleteError) throw new Error(deleteError.message)
    }

    const extractionResponse = await fetch(`${FUNCTION_BASE_URL}/process-email-job`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: req.headers.get('Authorization') ?? '',
      },
      body: JSON.stringify({ email_id: payload.email_id }),
    })

    if (!extractionResponse.ok) {
      return jsonResponse({ error: `process-email-job returned ${extractionResponse.status}` }, 500)
    }

    try {
      await supabase.from('audit_logs').insert({
        actor_id: userId,
        action: 'retry_extraction',
        entity: 'emails',
        entity_id: payload.email_id,
        old_data: { status: email.status },
        new_data: { retried: true },
      })
    } catch (auditErr) {
      console.error('retry-extraction audit log error:', (auditErr as Error).message)
    }

    return jsonResponse({ status: 'retried' }, 200)
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error('retry-extraction error:', errorMessage)
    return jsonResponse({ error: errorMessage }, 500)
  }
})
