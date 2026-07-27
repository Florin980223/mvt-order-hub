import { createClient } from 'npm:@supabase/supabase-js@2'
import { getValidAccessToken, graphFetch } from '../_shared/graphClient.ts'
import { FUNCTION_BASE_URL } from '../_shared/config.ts'

function serviceClient() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
}

interface DispatchPayload {
  queue_id: string
  connection_id: string
  graph_message_id: string
}

Deno.serve(async (req) => {
  let payload: DispatchPayload

  try {
    payload = await req.json()
  } catch {
    return new Response('invalid payload', { status: 400 })
  }

  const supabase = serviceClient()

  try {
    const accessToken = await getValidAccessToken(payload.connection_id)

    const messageResponse = await graphFetch(
      accessToken,
      `/me/messages/${payload.graph_message_id}?$select=subject,sender,receivedDateTime,body,hasAttachments`,
    )
    const message = await messageResponse.json()

    const sender = message.sender?.emailAddress?.address ?? 'necunoscut@necunoscut'
    const bodyHtml = message.body?.contentType === 'html' ? message.body.content : null

    const { data: email, error: emailError } = await supabase
      .from('emails')
      .upsert(
        {
          graph_message_id: payload.graph_message_id,
          sender,
          subject: message.subject ?? null,
          body_html: bodyHtml,
          received_at: message.receivedDateTime,
          status: 'new',
        },
        { onConflict: 'graph_message_id' },
      )
      .select('id')
      .single()

    if (emailError || !email) {
      throw new Error(emailError?.message ?? 'failed to upsert emails row')
    }

    await supabase.from('emails').update({ status: 'processing' }).eq('id', email.id)

    if (message.hasAttachments) {
      const downloadResponse = await fetch(`${FUNCTION_BASE_URL}/download-attachments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: req.headers.get('Authorization') ?? '',
        },
        body: JSON.stringify({
          email_id: email.id,
          graph_message_id: payload.graph_message_id,
          connection_id: payload.connection_id,
        }),
      })

      if (!downloadResponse.ok) {
        console.error('download-attachments returned', downloadResponse.status)
      }
    }

    const extractionResponse = await fetch(`${FUNCTION_BASE_URL}/process-email-job`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: req.headers.get('Authorization') ?? '',
      },
      body: JSON.stringify({ email_id: email.id }),
    })

    if (!extractionResponse.ok) {
      console.error('process-email-job returned', extractionResponse.status)
    }

    await supabase.from('email_ingest_queue').update({ status: 'done' }).eq('id', payload.queue_id)
    await supabase
      .from('mail_connections')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', payload.connection_id)

    return new Response(null, { status: 200 })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error('fetch-outlook-message error:', errorMessage)
    await supabase.rpc('mark_email_queue_failed', { p_queue_id: payload.queue_id, p_error: errorMessage })
    return new Response(null, { status: 500 })
  }
})
