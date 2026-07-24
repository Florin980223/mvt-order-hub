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

## Documentation

See [`CLAUDE.md`](./CLAUDE.md) for project conventions, and the [`docs/`](./docs) folder for architecture, decisions, and roadmap.
