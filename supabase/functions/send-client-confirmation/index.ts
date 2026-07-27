import { createClient } from 'npm:@supabase/supabase-js@2'
import { CORS_HEADERS, handleCorsPreflight } from '../_shared/cors.ts'
import { getValidAccessToken, graphFetch } from '../_shared/graphClient.ts'
import { buildConfirmationEmail } from '../_shared/confirmationEmailTemplate.ts'

interface SendClientConfirmationPayload {
  order_id: string
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

  let payload: SendClientConfirmationPayload
  try {
    payload = await req.json()
  } catch {
    return jsonResponse({ error: 'invalid payload' }, 400)
  }

  if (!payload.order_id) {
    return jsonResponse({ error: 'order_id is required' }, 400)
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

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(
        'id, email_id, status, client_order_number, pickup_address, pickup_at, delivery_address, delivery_at, carrier_proposed',
      )
      .eq('id', payload.order_id)
      .maybeSingle()
    if (orderError) throw new Error(orderError.message)
    if (!order) {
      return jsonResponse({ error: 'order not found' }, 404)
    }

    if (order.status !== 'imported') {
      return jsonResponse({ error: `order status '${order.status}' is not eligible for a confirmation email` }, 409)
    }

    const { data: email, error: emailError } = await supabase
      .from('emails')
      .select('sender, connection_id')
      .eq('id', order.email_id)
      .maybeSingle()
    if (emailError) throw new Error(emailError.message)
    if (!email) {
      throw new Error('email row not found for order')
    }

    // Older/seeded emails may not have connection_id set — falls back to
    // the single connected mailbox, same assumption brief 14.1 makes
    // ("inbox dedicat comenzilor").
    let connectionId = email.connection_id as string | null
    if (!connectionId) {
      const { data: connections, error: connectionsError } = await supabase
        .from('mail_connections')
        .select('id')
        .eq('status', 'connected')
      if (connectionsError) throw new Error(connectionsError.message)
      if (!connections || connections.length !== 1) {
        throw new Error(
          `cannot determine which mailbox to send from (email has no connection_id and ${
            connections?.length ?? 0
          } mailboxes are connected)`,
        )
      }
      connectionId = connections[0].id
    }

    const { subject, body } = buildConfirmationEmail(order)

    const accessToken = await getValidAccessToken(connectionId)
    await graphFetch(accessToken, '/me/sendMail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          subject,
          body: { contentType: 'Text', content: body },
          toRecipients: [{ emailAddress: { address: email.sender } }],
        },
        saveToSentItems: true,
      }),
    })

    await supabase.from('order_events').insert({
      order_id: order.id,
      event_type: 'confirmation_sent',
      payload: { to: email.sender },
      user_id: userId,
    })

    try {
      await supabase.from('audit_logs').insert({
        actor_id: userId,
        action: 'send_confirmation',
        entity: 'orders',
        entity_id: order.id,
        old_data: null,
        new_data: { to: email.sender },
      })
    } catch (auditErr) {
      console.error('send-client-confirmation audit log error:', (auditErr as Error).message)
    }

    return jsonResponse({ status: 'sent' }, 200)
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error('send-client-confirmation error:', errorMessage)
    return jsonResponse({ error: errorMessage }, 500)
  }
})
