import { createClient } from 'npm:@supabase/supabase-js@2'
import { CORS_HEADERS, handleCorsPreflight } from '../_shared/cors.ts'

const SETTING_KEY = 'outbound_api'
const ALLOWED_PROTOCOLS = ['http:', 'https:']

interface UpdateOutboundApiPayload {
  url: string
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

  let payload: UpdateOutboundApiPayload
  try {
    payload = await req.json()
  } catch {
    return jsonResponse({ error: 'invalid payload' }, 400)
  }

  if (typeof payload.url !== 'string' || !payload.url) {
    return jsonResponse({ error: 'url is required' }, 400)
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(payload.url)
  } catch {
    return jsonResponse({ error: 'url must be a valid URL' }, 400)
  }
  if (!ALLOWED_PROTOCOLS.includes(parsedUrl.protocol)) {
    return jsonResponse({ error: 'url must use http or https' }, 400)
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
      .select('role, active')
      .eq('id', userId)
      .maybeSingle()
    if (profileError) throw new Error(profileError.message)
    if (!profile?.active || profile.role !== 'admin') {
      return jsonResponse({ error: 'forbidden' }, 403)
    }

    const { data: existing, error: existingError } = await supabase
      .from('app_settings')
      .select('value_json')
      .eq('key', SETTING_KEY)
      .maybeSingle()
    if (existingError) throw new Error(existingError.message)

    const newValueJson = { url: parsedUrl.toString() }

    const { data: updated, error: updateError } = await supabase
      .from('app_settings')
      .update({ value_json: newValueJson, updated_by: userId })
      .eq('key', SETTING_KEY)
      .select('value_json, updated_at')
      .maybeSingle()
    if (updateError) throw new Error(updateError.message)
    if (!updated) {
      throw new Error(`app_settings row '${SETTING_KEY}' does not exist`)
    }

    try {
      await supabase.from('audit_logs').insert({
        actor_id: userId,
        action: 'update',
        entity: 'app_settings',
        old_data: { key: SETTING_KEY, value_json: existing?.value_json ?? null },
        new_data: { key: SETTING_KEY, value_json: newValueJson },
      })
    } catch (auditErr) {
      console.error('update-outbound-api-setting audit log error:', (auditErr as Error).message)
    }

    return jsonResponse({ url: newValueJson.url, updated_at: updated.updated_at }, 200)
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error('update-outbound-api-setting error:', errorMessage)
    return jsonResponse({ error: 'internal error' }, 500)
  }
})
