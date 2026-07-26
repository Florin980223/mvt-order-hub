// Hardcoded because Postgres migrations (which also build Edge Function
// URLs for pg_net dispatch) can't share a config layer with Deno code.
// If this project is ever recreated under a different ref, update both.
export const FUNCTION_BASE_URL = 'https://vwhykufuqumrumhzwujx.supabase.co/functions/v1'
