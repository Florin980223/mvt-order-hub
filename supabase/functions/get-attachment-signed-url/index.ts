import { createClient } from 'npm:@supabase/supabase-js@2'
import { CORS_HEADERS, handleCorsPreflight } from '../_shared/cors.ts'

const SIGNED_URL_EXPIRY_SECONDS = 120

interface GetAttachmentSignedUrlPayload {
  attachment_id: string
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

  let payload: GetAttachmentSignedUrlPayload
  try {
    payload = await req.json()
  } catch {
    return jsonResponse({ error: 'invalid payload' }, 400)
  }

  if (typeof payload.attachment_id !== 'string' || !payload.attachment_id) {
    return jsonResponse({ error: 'attachment_id is required' }, 400)
  }

  const supabase = serviceClient()

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace(/^Bearer\s+/i, '')

    const { data: userData, error: userError } = await supabase.auth.getUser(token)
    if (userError || !userData?.user) {
      return jsonResponse({ error: 'unauthorized' }, 401)
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('active')
      .eq('id', userData.user.id)
      .maybeSingle()
    if (profileError) throw new Error(profileError.message)
    if (!profile?.active) {
      return jsonResponse({ error: 'forbidden' }, 403)
    }

    const { data: attachment, error: attachmentError } = await supabase
      .from('email_attachments')
      .select('storage_path, filename')
      .eq('id', payload.attachment_id)
      .maybeSingle()
    if (attachmentError) throw new Error(attachmentError.message)
    if (!attachment) {
      return jsonResponse({ error: 'attachment not found' }, 404)
    }

    const { data: signed, error: signError } = await supabase.storage
      .from('email-attachments')
      .createSignedUrl(attachment.storage_path, SIGNED_URL_EXPIRY_SECONDS, { download: attachment.filename })
    if (signError || !signed) {
      throw new Error(signError?.message ?? 'failed to create signed URL')
    }

    return jsonResponse({ url: signed.signedUrl }, 200)
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error('get-attachment-signed-url error:', errorMessage)
    return jsonResponse({ error: 'internal error' }, 500)
  }
})
