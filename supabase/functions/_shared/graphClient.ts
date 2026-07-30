import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'

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

export interface ResolvedSendingConnection {
  connectionId: string
  accessToken: string
}

/**
 * Picks a connected mailbox with a usable Graph access token, for
 * server-side sends (client confirmations, replies, ...).
 *
 * If `explicitConnectionId` is set (e.g. the email row already has
 * connection_id), that connection is used as-is — a failure there is
 * surfaced directly, not silently masked by falling back. Only when there's
 * no explicit connection does this fall back through every `connected`
 * mail_connections row, newest-first, returning the first one that yields a
 * valid token.
 *
 * Older/seeded emails may not have connection_id set, and even when one is
 * set its refresh token can be dead (e.g. revoked, or the mailbox was
 * reconnected under a new connection). Brief 14.1's "inbox dedicat
 * comenzilor" assumes a single mailbox in steady state, but multiple can
 * legitimately end up connected (e.g. during setup/testing), so instead of
 * trusting a single deterministic pick (like get_primary_mailbox_address()'s
 * "oldest wins", fine for a read-only display but not for an action that
 * needs a live token), this tries the most-recently-connected mailboxes
 * first and falls through past any that fail to refresh.
 */
export async function resolveSendingConnection(
  supabase: SupabaseClient,
  explicitConnectionId: string | null,
): Promise<ResolvedSendingConnection> {
  // Matches the original send-client-confirmation behavior exactly: an
  // explicit connection_id is trusted as-is (no fallback if its token fails
  // to refresh — that's a real error worth surfacing, not silently masked).
  // The newest-first fallback only kicks in when there's no explicit id.
  if (explicitConnectionId) {
    const accessToken = await getValidAccessToken(explicitConnectionId)
    return { connectionId: explicitConnectionId, accessToken }
  }

  const { data: connections, error: connectionsError } = await supabase
    .from('mail_connections')
    .select('id')
    .eq('status', 'connected')
    .order('created_at', { ascending: false })
  if (connectionsError) throw new Error(connectionsError.message)
  if (!connections || connections.length === 0) {
    throw new Error('cannot determine which mailbox to send from (no connected mailbox available)')
  }

  let lastError: Error | null = null
  for (const candidate of connections) {
    try {
      const accessToken = await getValidAccessToken(candidate.id)
      return { connectionId: candidate.id, accessToken }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      console.error('resolveSendingConnection: connection', candidate.id, 'failed:', lastError.message)
    }
  }

  throw new Error(
    `no connected mailbox has a usable token (tried ${connections.length}; last error: ${lastError?.message ?? 'unknown'})`,
  )
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
