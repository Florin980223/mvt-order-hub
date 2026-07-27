import { createClient } from 'npm:@supabase/supabase-js@2'
import { CORS_HEADERS, handleCorsPreflight } from '../_shared/cors.ts'
import { GRAPH_SCOPES } from '../_shared/graphClient.ts'
import { hmacSha256Hex } from '../_shared/security.ts'
import { OAUTH_REDIRECT_URI } from '../_shared/config.ts'

function serviceClient() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

function randomHex(byteLength: number): string {
  const bytes = new Uint8Array(byteLength)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

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
      .select('role, active')
      .eq('id', userData.user.id)
      .maybeSingle()
    if (profileError) throw new Error(profileError.message)
    if (!profile?.active || profile.role !== 'admin') {
      return jsonResponse({ error: 'forbidden' }, 403)
    }

    // state = nonce.issuedAtMs.userId.signature — a fresh, unguessable value
    // per attempt, signed with a secret dedicated to this purpose (never
    // GRAPH_CLIENT_STATE_SECRET, which authenticates graph-webhook's
    // clientState and must never be exposed to the browser/Microsoft via
    // this browser-visible query param). userId travels through so
    // outlook-oauth-callback — which otherwise has no session at all, since
    // Microsoft calls it directly — can attribute the audit_logs 'connect'
    // entry to whoever actually initiated it; not a secret, and it returns
    // through the same admin's browser that sent it, so signing (not
    // encrypting) is enough to prevent tampering.
    const secret = Deno.env.get('OAUTH_STATE_HMAC_SECRET')
    if (!secret) throw new Error('OAUTH_STATE_HMAC_SECRET is not configured')

    const nonce = randomHex(16)
    const issuedAtMs = Date.now()
    const signature = await hmacSha256Hex(`${nonce}.${issuedAtMs}.${userData.user.id}`, secret)
    const state = `${nonce}.${issuedAtMs}.${userData.user.id}.${signature}`

    const authorizeUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize')
    authorizeUrl.searchParams.set('client_id', Deno.env.get('MICROSOFT_CLIENT_ID')!)
    authorizeUrl.searchParams.set('response_type', 'code')
    authorizeUrl.searchParams.set('redirect_uri', OAUTH_REDIRECT_URI)
    authorizeUrl.searchParams.set('response_mode', 'query')
    authorizeUrl.searchParams.set('scope', GRAPH_SCOPES)
    authorizeUrl.searchParams.set('state', state)

    return jsonResponse({ authorize_url: authorizeUrl.toString() }, 200)
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error('outlook-oauth-start error:', errorMessage)
    return jsonResponse({ error: 'internal error' }, 500)
  }
})
