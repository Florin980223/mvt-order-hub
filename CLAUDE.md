# CLAUDE.md

Guidance for Claude Code (or any agent) working in this repository.

## Project

MVT Order Hub — an application for processing transport orders received through Outlook. See `docs/PROJECT_ARCHITECTURE.md`, `docs/DECISIONS.md`, and `docs/ROADMAP.md` for full context.

## Stack

React, Vite, TypeScript, Supabase (Auth, PostgreSQL with Row Level Security, Storage, Edge Functions, Queues/Cron), Microsoft Graph, TanStack Query, react-router-dom, react-hook-form + zod, lucide-react.

## Folder structure

```
src/
├── app/            # App root, providers, router
├── pages/          # One component per route (auth/ for public pages)
├── components/     # Shared/reusable components (layout/ for app shell)
├── lib/            # Supabase client, query client, other shared clients
└── vite-env.d.ts   # Typed Vite env vars
```

## Security rules (non-negotiable)

- Never place `SUPABASE_SERVICE_ROLE_KEY`, Microsoft Graph secrets, or any external API secret in frontend code.
- Frontend uses only the Supabase publishable/anon key, via `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Sensitive integrations (Outlook/Graph, outbound API calls, service-role DB access) belong in Supabase Edge Functions, never in the browser.
- Operational database tables must use Row Level Security.
- Attachments must be stored in a private Supabase Storage bucket.
- Never print secrets in logs.
- Do not create real production integrations without explicit approval.

## Design and scope rules

- Do not invent the final visual design.
- Keep UI styling minimal until ChatGPT provides an approved design specification.
- Do not introduce gradients, arbitrary colors, new UI libraries, or design systems without explicit approval.
- When an approved CSS/UI specification is supplied, implement it exactly — do not redesign or improvise.
- Do not expand the scope of a phase without approval.
- Do not create commits or push changes without explicit approval.
- Do not make product or architecture decisions that contradict the project brief.

## Working conventions

- Prefer editing existing files over creating new ones; avoid speculative abstractions.
- No path alias configured yet — use relative imports.
- Comments only where the "why" is non-obvious; no restating what code does.
