# Decisions

A running log of decisions made for MVT Order Hub. Newer entries at the bottom.

## Product / platform decisions

- React, Vite, and TypeScript are used for the frontend.
- Supabase is the backend platform (Auth, PostgreSQL + RLS, Storage, Edge Functions, Queues/Cron).
- Delegated Microsoft OAuth is the provisional choice for connecting Outlook in the demo.
- The final decision on individual vs. shared mailbox connection is still pending.
- Mock email and attachment data will be used for development/testing until real anonymized samples are provided.
- The application will send validated order data to a configurable external outbound API.
- Direct AscendTMS integration is not part of the current implementation.
- ChatGPT owns the approved UI/CSS specifications for this project.
- Claude Code implements the supplied UI specifications and must not invent or redesign the final interface.
- Sensitive secrets and integrations (Microsoft Graph, service role key, outbound API credentials) remain backend-only, inside Supabase Edge Functions.

## Phase 1 technical decisions

- **Package manager**: npm — matches the existing `package-lock.json`.
- **Router style**: `react-router-dom` v7 declarative `<BrowserRouter>` + `<Routes>/<Route>`, not a data router — simplest fit for placeholder-only pages; can migrate to a data router later if loaders/actions become useful.
- **Imports**: plain relative imports; no `@/` path alias yet, to avoid touching `tsconfig`/`vite.config.ts` beyond what Phase 1 needs.
- **Supabase client**: `src/lib/supabaseClient.ts` validates `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` and throws a clear error if either is missing — no fallback/fake values. The module is not imported or initialized anywhere yet; it is wired up when real auth lands in Phase 2.
- **Query client**: a single shared `QueryClient` instance (`src/lib/queryClient.ts`) with default configuration; no devtools installed yet.
- **Auth guard**: not implemented in Phase 1. A `ProtectedRoute` wrapper around the `AppLayout` route group is planned for the next phase.
- **Styling**: `src/index.css` kept minimal and neutral in Phase 1 — only the Vite demo styling was removed. No final dashboard/sidebar/brand design has been implemented.

## Phase 6 technical decisions

- **Outbound API URL editing**: the non-secret outbound API URL seeded into `app_settings` (Phase 6b) is now admin-editable from Settings ("API extern" section). Reads stay a direct client-side `select` (already permitted by the `app_settings_select_admin` RLS policy); writes go through a new `update-outbound-api-setting` Edge Function using the service-role client, since `app_settings` has no client-writable RLS policy. The outbound API credential remains an Edge Function secret (`OUTBOUND_API_KEY`) and is never exposed in this UI.
