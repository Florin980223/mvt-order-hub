/**
 * Service-role Supabase client for local Node tooling only. Lives under
 * scripts/, never under src/, so it can never enter the browser bundle
 * (see CLAUDE.md security rules).
 */

import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { config as loadEnv } from 'dotenv'

loadEnv({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    'Missing local env config: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set in ' +
      '.env.local. SUPABASE_SERVICE_ROLE_KEY is local-only and must never be committed — see .env.example.',
  )
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})
