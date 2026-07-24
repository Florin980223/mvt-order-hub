# Project Architecture

## Overview

MVT Order Hub processes transport orders that arrive as Outlook emails, extracts structured order data from the email body and attachments (PDF, Excel, CSV), and submits validated data to a configurable outbound API — with a human review step for anything low-confidence or unrecognized.

## High-level data flow (target state, later phases)

```
Outlook mailbox
   │  Microsoft Graph change notifications
   ▼
Supabase Edge Function (webhook receiver)
   │  enqueues work, stores raw email + attachments in private Storage
   ▼
Supabase Queue / async processing (Edge Functions, Cron)
   │  deterministic JS/TS parsers (PDF text, XLS/XLSX, CSV, sanitized HTML)
   │  AI fallback only for missing/low-confidence fields
   ▼
PostgreSQL (RLS-protected tables)
   │  each extracted field carries source + confidence score
   │  manual corrections are audited
   ▼
Operator review (Emailuri noi / Comenzi in asteptare)
   │  approve / correct
   ▼
Outbound API submission (Comenzi transmise/importate)
```

## Frontend

- React + Vite + TypeScript SPA.
- `react-router-dom` for client-side routing.
- TanStack Query for server-state fetching/caching against Supabase.
- react-hook-form + zod for form handling and validation (forms introduced in later phases).
- Supabase Auth for login/registration/password reset; Admin and Operator roles.

## Backend (Supabase)

- **Auth**: email/password to start; delegated Microsoft OAuth is the provisional choice for Outlook connection (see `docs/DECISIONS.md`).
- **PostgreSQL + RLS**: all operational tables (emails, orders, attachments, audit log) protected by Row Level Security policies scoped to the authenticated user's role.
- **Storage**: attachments in a private bucket, never public.
- **Edge Functions**: the only place that holds Microsoft Graph tokens, the Supabase service role key, or outbound API secrets. Handles OAuth token exchange/refresh, Graph webhook receipt, parsing orchestration, and outbound submission.
- **Queues/Cron**: async processing of heavy extraction work and scheduled token refresh / reconciliation jobs.

## Security boundary

The browser only ever holds the Supabase publishable/anon key (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`). Every other secret (service role key, Microsoft Graph client secret/tokens, outbound API credentials) lives exclusively in Supabase Edge Function environment/secrets, never in frontend code or logs.

## Phase 1 scope

This phase only establishes the frontend shell: folder structure, routing, providers, and placeholder pages. No database schema, no Outlook integration, and no real authentication logic exist yet — see `docs/ROADMAP.md`.
