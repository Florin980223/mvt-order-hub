import { createClient } from 'npm:@supabase/supabase-js@2'
import { CORS_HEADERS, handleCorsPreflight } from '../_shared/cors.ts'

// Only orders still pre-import get cascade-rejected — retroactively
// flipping an already-imported/importing order to 'rejected' would be
// destructive and isn't what rejecting the source email means at that
// point (see docs/DECISIONS.md Phase 7a-7).
const CASCADE_REJECT_STATUSES = ['draft', 'needs_validation', 'ready_to_import', 'import_failed']

interface RejectEmailPayload {
  email_id: string
  reason?: string
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

  let payload: RejectEmailPayload
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
    if (email.status === 'rejected') {
      return jsonResponse({ error: 'email is already rejected' }, 409)
    }

    const previousEmailStatus = email.status

    const { error: emailUpdateError } = await supabase
      .from('emails')
      .update({ status: 'rejected' })
      .eq('id', payload.email_id)
    if (emailUpdateError) throw new Error(emailUpdateError.message)

    try {
      await supabase.from('audit_logs').insert({
        actor_id: userId,
        action: 'reject',
        entity: 'emails',
        entity_id: payload.email_id,
        old_data: { status: previousEmailStatus },
        new_data: { status: 'rejected', reason: payload.reason ?? null },
      })
    } catch (auditErr) {
      console.error('reject-email audit log error (email):', (auditErr as Error).message)
    }

    const { data: cascadeOrders, error: ordersError } = await supabase
      .from('orders')
      .select('id, status')
      .eq('email_id', payload.email_id)
      .in('status', CASCADE_REJECT_STATUSES)
    if (ordersError) throw new Error(ordersError.message)

    const rejectedOrderIds: string[] = []
    for (const order of cascadeOrders ?? []) {
      const { error: orderUpdateError } = await supabase.from('orders').update({ status: 'rejected' }).eq('id', order.id)
      if (orderUpdateError) {
        console.error('reject-email order cascade update error:', order.id, orderUpdateError.message)
        continue
      }
      rejectedOrderIds.push(order.id)

      try {
        await supabase.from('audit_logs').insert({
          actor_id: userId,
          action: 'reject',
          entity: 'orders',
          entity_id: order.id,
          old_data: { status: order.status },
          new_data: { status: 'rejected' },
        })
      } catch (auditErr) {
        console.error('reject-email audit log error (order):', order.id, (auditErr as Error).message)
      }
    }

    return jsonResponse({ status: 'rejected', cascaded_order_ids: rejectedOrderIds }, 200)
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error('reject-email error:', errorMessage)
    return jsonResponse({ error: errorMessage }, 500)
  }
})
