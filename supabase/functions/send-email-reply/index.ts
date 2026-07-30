import { createClient } from 'npm:@supabase/supabase-js@2'
import { CORS_HEADERS, handleCorsPreflight } from '../_shared/cors.ts'
import { graphFetch, resolveSendingConnection } from '../_shared/graphClient.ts'

interface SendEmailReplyPayload {
  email_id: string
  subject: string
  body: string
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

  let payload: SendEmailReplyPayload
  try {
    payload = await req.json()
  } catch {
    return jsonResponse({ error: 'invalid payload' }, 400)
  }

  if (!payload.email_id) {
    return jsonResponse({ error: 'email_id is required' }, 400)
  }
  if (!payload.subject || !payload.subject.trim()) {
    return jsonResponse({ error: 'subject is required' }, 400)
  }
  if (!payload.body || !payload.body.trim()) {
    return jsonResponse({ error: 'body is required' }, 400)
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
      .select('id, sender, connection_id')
      .eq('id', payload.email_id)
      .maybeSingle()
    if (emailError) throw new Error(emailError.message)
    if (!email) {
      return jsonResponse({ error: 'email not found' }, 404)
    }

    // Older/seeded emails may not have connection_id set — resolveSendingConnection
    // falls back to whichever connected mailbox actually has a usable token
    // (see _shared/graphClient.ts; same helper send-client-confirmation uses).
    const { accessToken } = await resolveSendingConnection(supabase, email.connection_id as string | null)

    await graphFetch(accessToken, '/me/sendMail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          subject: payload.subject,
          body: { contentType: 'Text', content: payload.body },
          toRecipients: [{ emailAddress: { address: email.sender } }],
        },
        saveToSentItems: true,
      }),
    })

    try {
      await supabase.from('audit_logs').insert({
        actor_id: userId,
        action: 'send_reply',
        entity: 'emails',
        entity_id: email.id,
        old_data: null,
        new_data: { to: email.sender, subject: payload.subject },
      })
    } catch (auditErr) {
      console.error('send-email-reply audit log error:', (auditErr as Error).message)
    }

    return jsonResponse({ status: 'sent' }, 200)
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error('send-email-reply error:', errorMessage)
    return jsonResponse({ error: errorMessage }, 500)
  }
})
