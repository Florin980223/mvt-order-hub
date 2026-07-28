import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { CORS_HEADERS, handleCorsPreflight } from '../_shared/cors.ts'

interface TogglePriorityPayload {
  order_id: string
  is_priority: boolean
}

function serviceClient(): SupabaseClient {
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

  let payload: TogglePriorityPayload
  try {
    payload = await req.json()
  } catch {
    return jsonResponse({ error: 'invalid payload' }, 400)
  }

  if (!payload.order_id || typeof payload.is_priority !== 'boolean') {
    return jsonResponse({ error: 'order_id and is_priority (boolean) are required' }, 400)
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
      .select('active')
      .eq('id', userId)
      .maybeSingle()
    if (profileError) throw new Error(profileError.message)
    if (!profile?.active) {
      return jsonResponse({ error: 'forbidden' }, 403)
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id')
      .eq('id', payload.order_id)
      .maybeSingle()
    if (orderError) throw new Error(orderError.message)
    if (!order) {
      return jsonResponse({ error: 'order not found' }, 404)
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update({ is_priority: payload.is_priority })
      .eq('id', payload.order_id)
    if (updateError) throw new Error(updateError.message)

    return jsonResponse({ status: 'updated', is_priority: payload.is_priority }, 200)
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error('toggle-order-priority error:', errorMessage)
    return jsonResponse({ error: errorMessage }, 500)
  }
})
