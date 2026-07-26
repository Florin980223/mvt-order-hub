import { createClient } from 'npm:@supabase/supabase-js@2'
import { getValidAccessToken, graphFetch } from '../_shared/graphClient.ts'
import { sha256Hex } from '../_shared/security.ts'
import { FUNCTION_BASE_URL } from '../_shared/config.ts'

function serviceClient() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
}

const RENEWAL_WINDOW_MS = 12 * 60 * 60 * 1000
const NEW_SUBSCRIPTION_LIFETIME_MS = 2.5 * 24 * 60 * 60 * 1000

Deno.serve(async () => {
  const supabase = serviceClient()

  const { data: expiring, error } = await supabase
    .from('graph_subscriptions')
    .select('id, connection_id, subscription_id, resource, expires_at')
    .lt('expires_at', new Date(Date.now() + RENEWAL_WINDOW_MS).toISOString())

  if (error) {
    console.error('renew-graph-subscription: failed to load expiring subscriptions:', error.message)
    return new Response(null, { status: 500 })
  }

  for (const subscription of expiring ?? []) {
    try {
      const accessToken = await getValidAccessToken(subscription.connection_id)
      const newExpiry = new Date(Date.now() + NEW_SUBSCRIPTION_LIFETIME_MS).toISOString()

      const patchResponse = await graphFetch(accessToken, `/subscriptions/${subscription.subscription_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expirationDateTime: newExpiry }),
      }).catch(() => null)

      if (patchResponse && patchResponse.ok) {
        await supabase.from('graph_subscriptions').update({ expires_at: newExpiry }).eq('id', subscription.id)
      } else {
        // Subscription no longer exists on Graph's side (e.g. 404) — recreate it.
        const clientState = Deno.env.get('GRAPH_CLIENT_STATE_SECRET')!
        const clientStateHash = await sha256Hex(clientState)

        const createResponse = await graphFetch(accessToken, '/subscriptions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            changeType: 'created',
            notificationUrl: `${FUNCTION_BASE_URL}/graph-webhook`,
            resource: subscription.resource,
            expirationDateTime: newExpiry,
            clientState,
          }),
        })
        const created = await createResponse.json()

        await supabase
          .from('graph_subscriptions')
          .update({
            subscription_id: created.id,
            expires_at: created.expirationDateTime,
            client_state_hash: clientStateHash,
          })
          .eq('id', subscription.id)
      }

      await supabase.from('mail_connections').update({ status: 'connected' }).eq('id', subscription.connection_id)
    } catch (err) {
      console.error(
        'renew-graph-subscription: renewal failed for',
        subscription.subscription_id,
        err instanceof Error ? err.message : err,
      )
      await supabase
        .from('mail_connections')
        .update({ status: 'expiring_soon' })
        .eq('id', subscription.connection_id)
    }
  }

  return new Response(null, { status: 200 })
})
