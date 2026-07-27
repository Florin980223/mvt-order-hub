import { createClient } from 'npm:@supabase/supabase-js@2'
import { getValidAccessToken, graphFetch } from '../_shared/graphClient.ts'
import { sha256Hex } from '../_shared/security.ts'

// Brief 11.2: "25 MB/fișier, configurabilă" — hardcoded for this phase
// rather than a new app_settings entry (unlike confidence_threshold,
// nothing suggests operators need to tune this at runtime yet; can be
// promoted to app_settings later using that exact same pattern).
const MAX_ATTACHMENT_SIZE_BYTES = 25 * 1024 * 1024

// Brief 11.1: "validare MIME/size" — a security allow-list, not just the
// narrower parsing-eligibility check in process-email-job (isCsv/isXlsx/
// isPdf). Without this, an .exe/.html/etc. attachment would be stored and
// made downloadable to any admin.
const SAFE_ATTACHMENT_EXTENSIONS = [
  '.csv',
  '.xlsx',
  '.xls',
  '.pdf',
  '.docx',
  '.doc',
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.bmp',
  '.webp',
  '.txt',
]

function serviceClient() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
}

/** Lowercased, including the dot (e.g. ".pdf") — empty string if the filename has no extension. */
function extensionOf(filename: string): string {
  const match = filename.match(/\.[^./\\]+$/)
  return match ? match[0].toLowerCase() : ''
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

        // Checked against Graph's own reported size, before decoding the
        // (much larger, base64) contentBytes payload — no point paying
        // the decode cost for something we're about to reject anyway.
        // Skipped exactly like an unparseable/non-file attachment: logged,
        // no email_attachments row, doesn't fail the rest of the email.
        if (attachment.size > MAX_ATTACHMENT_SIZE_BYTES) {
          console.error(
            `download-attachments: skipping oversized attachment ${attachment.name} (${attachment.size} bytes > ${MAX_ATTACHMENT_SIZE_BYTES})`,
          )
          continue
        }

        const extension = extensionOf(attachment.name)
        if (!SAFE_ATTACHMENT_EXTENSIONS.includes(extension)) {
          console.error(`download-attachments: skipping disallowed attachment type ${attachment.name} (extension "${extension}")`)
          continue
        }

        const bytes = base64ToBytes(attachment.contentBytes)
        const sha256 = await sha256Hex(bytes)
        // Content-addressed, randomized key (brief 11.1: "denumiri
        // randomizate") — never the sender-controlled filename.
        const storagePath = `${payload.email_id}/${sha256}${extension}`

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
