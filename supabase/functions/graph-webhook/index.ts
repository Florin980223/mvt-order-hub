import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { sha256Hex } from '../_shared/security.ts'

function serviceClient(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
}

interface GraphNotification {
  subscriptionId?: string
  clientState?: string
  resource?: string
  resourceData?: { id?: string }
}

interface EdgeRuntimeLike {
  waitUntil: (promise: Promise<unknown>) => void
}

Deno.serve(async (req) => {
  const url = new URL(req.url)
  const validationToken = url.searchParams.get('validationToken')

  // Microsoft's subscription-creation handshake: echo the token back as
  // plain text within its short timeout — no auth/DB work here.
  if (validationToken) {
    return new Response(validationToken, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  let payload: { value?: GraphNotification[] }

  try {
    payload = await req.json()
  } catch {
    return new Response(null, { status: 202 })
  }

  const supabase = serviceClient()
  const notifications = payload.value ?? []

  // Respond fast (no heavy processing inline); keep the isolate alive just
  // long enough to finish queueing via EdgeRuntime.waitUntil.
  const edgeRuntime = (globalThis as unknown as { EdgeRuntime?: EdgeRuntimeLike }).EdgeRuntime
  for (const notification of notifications) {
    const task = processNotification(supabase, notification).catch((err) => {
      console.error('graph-webhook notification error:', err instanceof Error ? err.message : err)
    })
    edgeRuntime?.waitUntil(task)
  }

  return new Response(null, { status: 202 })
})

async function processNotification(supabase: SupabaseClient, notification: GraphNotification) {
  const { subscriptionId, clientState, resource, resourceData } = notification
  const graphMessageId = resourceData?.id

  if (!subscriptionId || !clientState || !graphMessageId) {
    return
  }

  const { data: subscription } = await supabase
    .from('graph_subscriptions')
    .select('connection_id, client_state_hash')
    .eq('subscription_id', subscriptionId)
    .maybeSingle()

  if (!subscription) {
    return
  }

  const hash = await sha256Hex(clientState)
  if (hash !== subscription.client_state_hash) {
    return
  }

  const { error } = await supabase.from('email_ingest_queue').upsert(
    {
      connection_id: subscription.connection_id,
      graph_message_id: graphMessageId,
      resource: resource ?? null,
    },
    { onConflict: 'graph_message_id', ignoreDuplicates: true },
  )

  if (error) {
    throw error
  }
}
