create table public.emails (
  id uuid primary key default gen_random_uuid(),
  graph_message_id text not null unique,
  sender text not null,
  subject text,
  body_html text,
  body_text text,
  received_at timestamptz not null,
  status text not null default 'new'
    check (status in ('new', 'queued', 'processing', 'extracted', 'needs_validation', 'rejected', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.emails enable row level security;

create policy "emails_select_active_profile" on public.emails
  for select using (public.is_active_profile());

create trigger set_emails_updated_at
  before update on public.emails
  for each row execute function public.set_updated_at();

create table public.email_attachments (
  id uuid primary key default gen_random_uuid(),
  email_id uuid not null references public.emails (id) on delete cascade,
  filename text not null,
  mime_type text not null,
  size bigint not null,
  storage_path text not null,
  sha256 text not null,
  created_at timestamptz not null default now()
);

alter table public.email_attachments enable row level security;

create policy "email_attachments_select_active_profile" on public.email_attachments
  for select using (public.is_active_profile());

-- Non-unique: supports later duplicate-detection lookups (Phase 4+),
-- doesn't enforce uniqueness since dedup logic itself lands in a later phase.
create index email_attachments_sha256_idx on public.email_attachments (sha256);

create table public.extraction_jobs (
  id uuid primary key default gen_random_uuid(),
  email_id uuid not null references public.emails (id) on delete cascade,
  mode text not null check (mode in ('javascript', 'ai', 'hybrid')),
  status text not null default 'pending'
    check (status in ('pending', 'running', 'succeeded', 'failed')),
  attempts integer not null default 0,
  error text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.extraction_jobs enable row level security;

create policy "extraction_jobs_select_active_profile" on public.extraction_jobs
  for select using (public.is_active_profile());
