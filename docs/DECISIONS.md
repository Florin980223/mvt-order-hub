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

## Phase 7a technical decisions

- **Extraction pipeline wiring**: `fetch-outlook-message` now calls a new `process-email-job` Edge Function (same internal-fetch pattern already used for `download-attachments`) right after attachments are downloaded, so every ingested email is deterministically parsed automatically — no separate extraction queue/cron was introduced; `extraction_jobs` itself is the durable per-attempt record. `emails.status` now progresses `new` → `processing` → `extracted`/`needs_validation`; the brief's `queued` state is intentionally represented by `email_ingest_queue.status` rather than duplicated onto `emails.status`, since the `emails` row doesn't exist until the queued item is claimed.
- **Reusing `src/lib/extraction/*` from Deno**: rather than duplicating the parser library, `process-email-job` imports it directly via relative paths. Its npm dependencies (`papaparse`, `exceljs`, `unpdf`, `html-to-text`) are bare specifiers that Deno can't resolve on its own — fixed with `supabase/functions/deno.json` (an `"imports"` map to the pinned `npm:` equivalents), which Deno auto-discovers; the CLI's `--import-map` flag pointing at a legacy `import_map.json` did **not** work in local testing and was removed. Binary parser functions (`parseCsv`/`parseXlsx`/`parsePdf`) are typed against Node's `Buffer`; `process-email-job` wraps downloaded Storage bytes via `Buffer.from(...)` using Deno's built-in `node:buffer` compat, with no changes to the library itself. Verified end-to-end with `supabase functions serve` against a real XLSX + a real digital PDF (correct field extraction, correct per-field source/confidence) and a real scanned/no-text-layer PDF (correctly flagged "needs OCR/validare", order created with the fixed note field, `needs_validation`).
- **AI fallback and legacy `.xls` remain out of scope** for this phase (no AI provider chosen yet per the brief's own open-decisions list; `.xls`, pre-2007 binary Excel, isn't supported by the underlying `exceljs` library) — unchanged from before this work.
