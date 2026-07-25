# MVT Order Hub

Production-oriented MVP for processing transport orders received through Outlook.

## Stack

React, Vite, TypeScript, Supabase (Auth, Postgres with Row Level Security, Storage, Edge Functions), Microsoft Graph (future Outlook integration), TanStack Query, react-router-dom.

## Getting started

```bash
npm install
cp .env.example .env   # fill in your Supabase project values
npm run dev
```

## Scripts

- `npm run dev` — start the Vite dev server
- `npm run lint` — run ESLint
- `npm run typecheck` — run the TypeScript compiler in check-only mode
- `npm run build` — typecheck and build for production
- `npm run preview` — preview the production build locally

## Database migrations

SQL migrations live in `supabase/migrations/`. No Supabase project is linked yet in this
repo. Once real project credentials are available:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

This applies `supabase/migrations/20260725120000_create_profiles.sql`, which creates the
`profiles` table (RLS-protected) and the trigger that populates it from `auth.users` on
signup.

## Documentation

See [`CLAUDE.md`](./CLAUDE.md) for project conventions, and the [`docs/`](./docs) folder for architecture, decisions, and roadmap.
