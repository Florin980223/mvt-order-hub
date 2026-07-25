-- Outlook connection metadata only — token_ref points to a secret store,
-- never a token value itself.
create table public.mail_connections (
  id uuid primary key default gen_random_uuid(),
  mailbox_address text not null,
  tenant_id text not null,
  token_ref text not null,
  status text not null default 'disconnected'
    check (status in ('disconnected', 'connecting', 'connected', 'expiring_soon', 'error')),
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.mail_connections enable row level security;

create policy "mail_connections_select_admin" on public.mail_connections
  for select using (public.is_admin());

create trigger set_mail_connections_updated_at
  before update on public.mail_connections
  for each row execute function public.set_updated_at();

create table public.graph_subscriptions (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.mail_connections (id) on delete cascade,
  subscription_id text not null unique,
  resource text not null,
  expires_at timestamptz not null,
  client_state_hash text not null,
  created_at timestamptz not null default now()
);

alter table public.graph_subscriptions enable row level security;

create policy "graph_subscriptions_select_admin" on public.graph_subscriptions
  for select using (public.is_admin());
