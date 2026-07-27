import { createClient } from 'npm:@supabase/supabase-js@2'

const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0'
const TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1000

export const GRAPH_SCOPES =
  'https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/User.Read offline_access'

interface StoredTokens {
  access_token: string
  refresh_token: string
  expires_at: string
}

function serviceClient() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
}

export async function getValidAccessToken(connectionId: string): Promise<string> {
  const supabase = serviceClient()

  const { data: connection, error: connectionError } = await supabase
    .from('mail_connections')
    .select('id, token_ref')
    .eq('id', connectionId)
    .single()

  if (connectionError || !connection) {
    throw new Error('mail_connections row not found for connection_id')
  }

  const { data: secretValue, error: readError } = await supabase.rpc('read_mail_connection_secret', {
    p_token_ref: connection.token_ref,
  })

  if (readError || !secretValue) {
    throw new Error('failed to read stored Graph tokens')
  }

  const tokens: StoredTokens = JSON.parse(secretValue)

  if (new Date(tokens.expires_at).getTime() - Date.now() > TOKEN_REFRESH_MARGIN_MS) {
    return tokens.access_token
  }

  const refreshed = await refreshTokens(tokens.refresh_token)

  await supabase.rpc('update_mail_connection_secret', {
    p_token_ref: connection.token_ref,
    p_secret_value: JSON.stringify(refreshed),
  })

  return refreshed.access_token
}

async function refreshTokens(refreshToken: string): Promise<StoredTokens> {
  const clientId = Deno.env.get('MICROSOFT_CLIENT_ID')!
  const clientSecret = Deno.env.get('MICROSOFT_CLIENT_SECRET')!

  // Personal Microsoft accounts (MSA) get a token format that Graph's
  // subscription endpoint rejects when minted against the tenant-specific
  // authority — "common" works for both MSA and work/school accounts.
  const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      scope: GRAPH_SCOPES,
    }),
  })

  if (!response.ok) {
    throw new Error(`failed to refresh Microsoft Graph token (${response.status})`)
  }

  const body = await response.json()

  return {
    access_token: body.access_token,
    refresh_token: body.refresh_token ?? refreshToken,
    expires_at: new Date(Date.now() + body.expires_in * 1000).toISOString(),
  }
}

const GRAPH_FETCH_MAX_ATTEMPTS = 4
const GRAPH_FETCH_BASE_DELAY_MS = 500
const GRAPH_FETCH_MAX_RETRY_AFTER_MS = 30 * 1000

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Retry-After is documented as seconds, but tolerate an HTTP-date value too. */
function parseRetryAfterMs(header: string | null): number | null {
  if (!header) return null

  const seconds = Number(header)
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000)

  const dateMs = Date.parse(header)
  if (!Number.isNaN(dateMs)) return Math.max(0, dateMs - Date.now())

  return null
}

export async function graphFetch(accessToken: string, path: string, init: RequestInit = {}): Promise<Response> {
  let lastResponse: Response | null = null

  for (let attempt = 1; attempt <= GRAPH_FETCH_MAX_ATTEMPTS; attempt++) {
    const response = await fetch(`${GRAPH_BASE_URL}${path}`, {
      ...init,
      headers: {
        ...init.headers,
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (response.ok) return response

    const isRetryable = response.status === 429 || response.status >= 500
    if (!isRetryable || attempt === GRAPH_FETCH_MAX_ATTEMPTS) {
      const text = await response.text()
      throw new Error(`Graph request failed (${response.status}): ${text}`)
    }

    lastResponse = response

    const retryAfterMs = response.status === 429 ? parseRetryAfterMs(response.headers.get('Retry-After')) : null
    const delayMs =
      retryAfterMs !== null
        ? Math.min(retryAfterMs, GRAPH_FETCH_MAX_RETRY_AFTER_MS)
        : GRAPH_FETCH_BASE_DELAY_MS * 2 ** (attempt - 1)

    await sleep(delayMs)
  }

  // Unreachable — the loop always returns or throws — but keeps the type checker happy.
  throw new Error(`Graph request failed (${lastResponse?.status ?? 'unknown'}): exhausted retries`)
}
