import { createClient } from 'npm:@supabase/supabase-js@2'
import { getValidAccessToken, graphFetch } from '../_shared/graphClient.ts'
import { sha256Hex } from '../_shared/security.ts'

function serviceClient() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
}

interface DispatchPayload {
  email_id: string
  graph_message_id: string
  connection_id: string
}

interface GraphAttachment {
  name: string
  contentType: string
  size: number
  contentBytes?: string
  '@odata.type': string
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
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

    const attachmentsResponse = await graphFetch(
      accessToken,
      `/me/messages/${payload.graph_message_id}/attachments`,
    )
    const { value: attachments } = (await attachmentsResponse.json()) as { value: GraphAttachment[] }

    for (const attachment of attachments) {
      try {
        // Only inline file attachments are handled this phase — very
        // large attachments needing Graph's $value streaming are a known
        // gap, and non-file attachments (e.g. itemAttachment) are skipped.
        if (attachment['@odata.type'] !== '#microsoft.graph.fileAttachment' || !attachment.contentBytes) {
          continue
        }

        const bytes = base64ToBytes(attachment.contentBytes)
        const sha256 = await sha256Hex(bytes)
        const storagePath = `${payload.email_id}/${attachment.name}`

        const { error: uploadError } = await supabase.storage
          .from('email-attachments')
          .upload(storagePath, bytes, {
            contentType: attachment.contentType,
            upsert: true,
          })

        if (uploadError) {
          throw new Error(uploadError.message)
        }

        await supabase.from('email_attachments').insert({
          email_id: payload.email_id,
          filename: attachment.name,
          mime_type: attachment.contentType,
          size: attachment.size,
          storage_path: storagePath,
          sha256,
        })
      } catch (attachmentErr) {
        // A single failed attachment doesn't fail the whole email row.
        console.error(
          'download-attachments: failed for one attachment:',
          attachmentErr instanceof Error ? attachmentErr.message : attachmentErr,
        )
      }
    }

    return new Response(null, { status: 200 })
  } catch (err) {
    console.error('download-attachments error:', err instanceof Error ? err.message : err)
    return new Response(null, { status: 500 })
  }
})
