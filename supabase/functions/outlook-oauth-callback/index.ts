import { createClient } from 'npm:@supabase/supabase-js@2'
import { GRAPH_SCOPES, graphFetch } from '../_shared/graphClient.ts'
import { sha256Hex, timingSafeEqual } from '../_shared/security.ts'
import { FUNCTION_BASE_URL } from '../_shared/config.ts'

const REDIRECT_URI = `${FUNCTION_BASE_URL}/outlook-oauth-callback`
const WEBHOOK_URL = `${FUNCTION_BASE_URL}/graph-webhook`
const SUBSCRIPTION_LIFETIME_MS = 2.5 * 24 * 60 * 60 * 1000

// Phase-4a-only simplification: a static shared-secret `state` value is
// enough for this backend-only manual test (no frontend session exists
// yet to originate a per-request nonce). MUST become a real per-request
// nonce, generated and verified server-side, before Phase 4b ships a
// public "Connect Outlook" button — do not carry this shortcut forward.
function isValidState(state: string | null): boolean {
  const expected = Deno.env.get('GRAPH_CLIENT_STATE_SECRET')
  if (!state || !expected) return false
  return timingSafeEqual(state, expected)
}

function serviceClient() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
}

function htmlResponse(body: string, status = 200): Response {
  return new Response(`<!doctype html><html><body>${body}</body></html>`, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

Deno.serve(async (req) => {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const oauthError = url.searchParams.get('error')

  if (oauthError) {
    return htmlResponse('<h1>Conectare eșuată</h1><p>Microsoft a returnat o eroare de consimțământ.</p>', 400)
  }

  if (!code || !isValidState(state)) {
    return htmlResponse('<h1>Cerere invalidă</h1><p>Parametrii code/state lipsesc sau sunt invalizi.</p>', 400)
  }

  try {
    const tenantId = Deno.env.get('MICROSOFT_TENANT_ID')!
    const clientId = Deno.env.get('MICROSOFT_CLIENT_ID')!
    const clientSecret = Deno.env.get('MICROSOFT_CLIENT_SECRET')!

    // Personal Microsoft accounts (MSA) get a token format that Graph's
    // subscription endpoint rejects when minted against the tenant-specific
    // authority — "common" works for both MSA and work/school accounts.
    // MICROSOFT_TENANT_ID itself is still used below for the mail_connections
    // row (which tenant this connection belongs to), just not in this URL.
    const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        scope: GRAPH_SCOPES,
      }),
    })

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text()
      console.error('outlook-oauth-callback token exchange failed:', tokenResponse.status, errorBody)
      throw new Error(`token exchange failed (${tokenResponse.status})`)
    }

    const tokenBody = await tokenResponse.json()
    const expiresAt = new Date(Date.now() + tokenBody.expires_in * 1000).toISOString()

    const meResponse = await graphFetch(tokenBody.access_token, '/me?$select=mail,userPrincipalName')
    const me = await meResponse.json()
    const mailboxAddress: string | undefined = me.mail ?? me.userPrincipalName

    if (!mailboxAddress) {
      throw new Error('could not determine mailbox address from Graph /me response')
    }

    const supabase = serviceClient()

    const { data: tokenRef, error: vaultError } = await supabase.rpc('store_mail_connection_secret', {
      p_secret_value: JSON.stringify({
        access_token: tokenBody.access_token,
        refresh_token: tokenBody.refresh_token,
        expires_at: expiresAt,
      }),
    })

    if (vaultError || !tokenRef) {
      throw new Error('failed to store Graph tokens in Vault')
    }

    const { data: connection, error: upsertError } = await supabase
      .from('mail_connections')
      .upsert(
        {
          mailbox_address: mailboxAddress,
          tenant_id: tenantId,
          token_ref: tokenRef,
          status: 'connected',
        },
        { onConflict: 'mailbox_address' },
      )
      .select('id')
      .single()

    if (upsertError || !connection) {
      if (upsertError) {
        console.error('outlook-oauth-callback mail_connections upsert failed:', {
          message: upsertError.message,
          code: upsertError.code,
          details: upsertError.details,
          hint: upsertError.hint,
        })
      }
      throw new Error('failed to upsert mail_connections row')
    }

    const clientState = Deno.env.get('GRAPH_CLIENT_STATE_SECRET')!
    const clientStateHash = await sha256Hex(clientState)

    const subscriptionResponse = await graphFetch(tokenBody.access_token, '/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        changeType: 'created',
        notificationUrl: WEBHOOK_URL,
        resource: "me/mailFolders('Inbox')/messages",
        expirationDateTime: new Date(Date.now() + SUBSCRIPTION_LIFETIME_MS).toISOString(),
        clientState,
      }),
    })

    const subscription = await subscriptionResponse.json()

    await supabase.from('graph_subscriptions').insert({
      connection_id: connection.id,
      subscription_id: subscription.id,
      resource: subscription.resource,
      expires_at: subscription.expirationDateTime,
      client_state_hash: clientStateHash,
    })

    return htmlResponse(
      `<h1>Outlook conectat</h1><p>Mailbox conectat: ${mailboxAddress}</p><p>Poți închide această filă.</p>`,
    )
  } catch (err) {
    console.error('outlook-oauth-callback error:', err instanceof Error ? err.message : err)
    return htmlResponse(
      '<h1>Conectare eșuată</h1><p>A apărut o eroare neașteptată. Verifică logurile funcției.</p>',
      500,
    )
  }
})
