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

SQL migrations live in `supabase/migrations/`. Apply them with:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

## Outlook connection (Phase 4a manual test)

Phase 4a wires up the Outlook OAuth + Microsoft Graph webhook pipeline
entirely server-side — there's no "Connect Outlook" button yet (that's
Phase 4b). To exercise it manually against the test tenant:

1. **One-time setup**: the queue dispatcher and subscription-renewal cron
   jobs call Edge Functions from Postgres via `pg_net`, authenticated with
   the Supabase service-role key. That key must never appear in a
   migration file, so store it in Vault once, from the SQL editor:

   ```sql
   select vault.create_secret('<your service role key>', 'service_role_key');
   ```

2. **Deploy the functions**, making sure `graph-webhook` is live before you
   test — Microsoft calls it synchronously (the `validationToken`
   handshake) as part of creating the subscription inside
   `outlook-oauth-callback`.

3. **Authorize URL** — fill in the three bracketed placeholders yourself
   from Dashboard → Edge Functions → Secrets (values are never printed
   here), then paste the full single-line URL into a browser and sign in
   with a test-tenant mailbox:

   ```
   https://login.microsoftonline.com/{MICROSOFT_TENANT_ID}/oauth2/v2.0/authorize?client_id={MICROSOFT_CLIENT_ID}&response_type=code&response_mode=query&redirect_uri=https%3A%2F%2Fvwhykufuqumrumhzwujx.supabase.co%2Ffunctions%2Fv1%2Foutlook-oauth-callback&scope=https%3A%2F%2Fgraph.microsoft.com%2FMail.Read%20https%3A%2F%2Fgraph.microsoft.com%2FMail.ReadWrite%20https%3A%2F%2Fgraph.microsoft.com%2FUser.Read%20offline_access&state={GRAPH_CLIENT_STATE_SECRET value}
   ```

   A successful run lands on a plain "Outlook conectat" page.

**Important**: the `state` parameter above reuses the static
`GRAPH_CLIENT_STATE_SECRET` value — a Phase-4a-only simplification for this
manual test, since there's no frontend session yet to originate a
per-request nonce. This **must** be replaced with a real per-request nonce,
generated and verified server-side, before Phase 4b ships a public "Connect
Outlook" button.

## Documentation

See [`CLAUDE.md`](./CLAUDE.md) for project conventions, and the [`docs/`](./docs) folder for architecture, decisions, and roadmap.
