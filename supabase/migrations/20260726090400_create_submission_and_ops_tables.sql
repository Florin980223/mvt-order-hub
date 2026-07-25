create table public.submission_jobs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  mode text check (mode in ('manual', 'automatic')),
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'succeeded', 'failed')),
  external_id text,
  request jsonb,
  response jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.submission_jobs enable row level security;

create policy "submission_jobs_select_active_profile" on public.submission_jobs
  for select using (public.is_active_profile());

create trigger set_submission_jobs_updated_at
  before update on public.submission_jobs
  for each row execute function public.set_updated_at();

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  read_at timestamptz,
  entity_type text,
  entity_id uuid,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

create policy "notifications_select_own" on public.notifications
  for select using (user_id = auth.uid() and public.is_active_profile());

create policy "notifications_update_own" on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.app_settings (
  key text primary key,
  value_json jsonb not null,
  encrypted boolean not null default false,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

-- `encrypted` is informational metadata only — real secrets never belong
-- here regardless of this flag; they live in Edge Function environment
-- variables (see CLAUDE.md).
alter table public.app_settings enable row level security;

create policy "app_settings_select_admin" on public.app_settings
  for select using (public.is_admin());

create trigger set_app_settings_updated_at
  before update on public.app_settings
  for each row execute function public.set_updated_at();

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity text not null,
  entity_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip inet,
  created_at timestamptz not null default now()
);

alter table public.audit_logs enable row level security;

create policy "audit_logs_select_admin" on public.audit_logs
  for select using (public.is_admin());

create policy "audit_logs_select_own" on public.audit_logs
  for select using (actor_id = auth.uid() and public.is_active_profile());

create index audit_logs_entity_idx on public.audit_logs (entity, entity_id);
create index audit_logs_created_at_idx on public.audit_logs (created_at);
