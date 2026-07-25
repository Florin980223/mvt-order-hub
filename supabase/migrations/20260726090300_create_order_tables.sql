create table public.orders (
  id uuid primary key default gen_random_uuid(),
  email_id uuid not null references public.emails (id) on delete restrict,
  client_order_number text,
  client_name text,
  pickup_address text,
  pickup_at timestamptz,
  delivery_address text,
  delivery_at timestamptz,
  cargo_type text,
  quantity numeric,
  quantity_unit text,
  weight_kg numeric,
  volume_m3 numeric,
  transport_amount numeric,
  currency char(3) not null default 'EUR',
  carrier_proposed text,
  notes text,
  confidence_overall numeric check (confidence_overall >= 0 and confidence_overall <= 1),
  status text not null default 'draft'
    check (status in ('draft', 'needs_validation', 'ready_to_import', 'importing', 'imported', 'import_failed', 'rejected')),
  external_reference_id text,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.orders enable row level security;

create policy "orders_select_active_profile" on public.orders
  for select using (public.is_active_profile());

create trigger set_orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- Concept-only support for later duplicate-detection logic (not a unique
-- constraint — actual dedup rules land in a later phase).
create index orders_client_order_lookup_idx on public.orders (client_order_number, client_name);

create table public.order_field_sources (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  field_name text not null,
  source_type text not null
    check (source_type in ('email_body', 'pdf', 'xlsx', 'csv', 'ai', 'manual')),
  source_ref text,
  confidence numeric check (confidence >= 0 and confidence <= 1),
  created_at timestamptz not null default now()
);

alter table public.order_field_sources enable row level security;

create policy "order_field_sources_select_active_profile" on public.order_field_sources
  for select using (public.is_active_profile());

-- Non-unique: multiple rows per (order_id, field_name) are expected over
-- time (manual-correction history).
create index order_field_sources_order_field_idx on public.order_field_sources (order_id, field_name);

create table public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  user_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.order_events enable row level security;

create policy "order_events_select_active_profile" on public.order_events
  for select using (public.is_active_profile());

create index order_events_order_created_idx on public.order_events (order_id, created_at);
