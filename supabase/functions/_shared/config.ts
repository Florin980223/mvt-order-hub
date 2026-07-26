// Hardcoded because Postgres migrations (which also build Edge Function
// URLs for pg_net dispatch) can't share a config layer with Deno code.
// If this project is ever recreated under a different ref, update both.
export const FUNCTION_BASE_URL = 'https://vwhykufuqumrumhzwujx.supabase.co/functions/v1'

// Shared by outlook-oauth-start (builds the authorize URL) and
// outlook-oauth-callback (exchanges the code) — both must send Microsoft
// the exact same redirect_uri or the token exchange is rejected.
export const OAUTH_REDIRECT_URI = `${FUNCTION_BASE_URL}/outlook-oauth-callback`
