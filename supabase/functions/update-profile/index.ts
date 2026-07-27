import { createClient } from 'npm:@supabase/supabase-js@2'
import { CORS_HEADERS, handleCorsPreflight } from '../_shared/cors.ts'

const VALID_ROLES = ['admin', 'operator']

interface UpdateProfilePayload {
  profile_id: string
  active?: boolean
  role?: string
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

  let payload: UpdateProfilePayload
  try {
    payload = await req.json()
  } catch {
    return jsonResponse({ error: 'invalid payload' }, 400)
  }

  if (!payload.profile_id) {
    return jsonResponse({ error: 'profile_id is required' }, 400)
  }
  if (payload.active === undefined && payload.role === undefined) {
    return jsonResponse({ error: 'at least one of active/role is required' }, 400)
  }
  if (payload.role !== undefined && !VALID_ROLES.includes(payload.role)) {
    return jsonResponse({ error: `role must be one of ${VALID_ROLES.join(', ')}` }, 400)
  }

  const supabase = serviceClient()

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace(/^Bearer\s+/i, '')

    const { data: userData, error: userError } = await supabase.auth.getUser(token)
    if (userError || !userData?.user) {
      return jsonResponse({ error: 'unauthorized' }, 401)
    }
    const callerId = userData.user.id

    const { data: callerProfile, error: callerProfileError } = await supabase
      .from('profiles')
      .select('role, active')
      .eq('id', callerId)
      .maybeSingle()
    if (callerProfileError) throw new Error(callerProfileError.message)
    if (!callerProfile?.active || callerProfile.role !== 'admin') {
      return jsonResponse({ error: 'forbidden' }, 403)
    }

    // An admin can never deactivate or demote their own account through
    // this endpoint — only another admin can do that to them.
    if (payload.profile_id === callerId) {
      if (payload.active === false) {
        return jsonResponse({ error: 'cannot deactivate your own account' }, 400)
      }
      if (payload.role !== undefined && payload.role !== 'admin') {
        return jsonResponse({ error: 'cannot demote your own account' }, 400)
      }
    }

    const { data: targetProfile, error: targetProfileError } = await supabase
      .from('profiles')
      .select('full_name, role, active')
      .eq('id', payload.profile_id)
      .maybeSingle()
    if (targetProfileError) throw new Error(targetProfileError.message)
    if (!targetProfile) {
      return jsonResponse({ error: 'profile not found' }, 404)
    }

    const updates: { active?: boolean; role?: string } = {}
    if (payload.active !== undefined) updates.active = payload.active
    if (payload.role !== undefined) updates.role = payload.role

    const { data: updated, error: updateError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', payload.profile_id)
      .select('id, full_name, role, active')
      .single()
    if (updateError) throw new Error(updateError.message)

    try {
      await supabase.from('audit_logs').insert({
        actor_id: callerId,
        action: 'update_user',
        entity: 'profiles',
        entity_id: payload.profile_id,
        old_data: { role: targetProfile.role, active: targetProfile.active },
        new_data: updates,
      })
    } catch (auditErr) {
      console.error('update-profile audit log error:', (auditErr as Error).message)
    }

    return jsonResponse(updated, 200)
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error('update-profile error:', errorMessage)
    return jsonResponse({ error: 'internal error' }, 500)
  }
})
