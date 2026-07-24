# Roadmap

## Phase 1 — Scaffold cleanup & foundation (this phase)

- Remove Vite demo scaffold, establish folder structure.
- Install baseline dependencies: react-router-dom, @supabase/supabase-js, @tanstack/react-query, react-hook-form, zod, @hookform/resolvers, lucide-react.
- Configure Supabase browser client (unwired), TanStack Query client, React Router.
- Placeholder pages for every required route; project docs (`CLAUDE.md`, `docs/*`).

## Phase 2 — Authentication

- Wire up Supabase Auth: login, registration, logout, password reset forms (react-hook-form + zod).
- Implement `ProtectedRoute` guard around application routes.
- Admin and Operator roles.

## Phase 3 — Database schema & RLS

- Design and migrate operational tables (emails, orders, attachments, audit log).
- Row Level Security policies per role.

## Phase 4 — Outlook / Microsoft Graph ingestion

- OAuth connection flow from Settings page, handled entirely server-side.
- Microsoft Graph change notifications → Supabase Edge Function webhook receiver.
- Private attachment storage; duplicate email/submission prevention.

## Phase 5 — Extraction pipeline

- Deterministic JS/TS parsers: email body/sanitized HTML, PDF (digital), XLS/XLSX, CSV.
- Scanned PDFs flagged for OCR/manual validation.
- AI fallback only for missing/low-confidence fields; each field records source + confidence.
- Manual correction audit trail.

## Phase 6 — Outbound submission & reporting

- Configurable outbound API integration for validated order data.
- Duplicate submission prevention.
- Reports page and dashboard metrics.
