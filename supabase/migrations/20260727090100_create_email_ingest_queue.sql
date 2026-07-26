create extension if not exists pg_net;

create table public.email_ingest_queue (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.mail_connections (id) on delete cascade,
  graph_message_id text not null unique,
  resource text,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'done', 'failed')),
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.email_ingest_queue enable row level security;

create policy "email_ingest_queue_select_admin" on public.email_ingest_queue
  for select using (public.is_admin());

create trigger set_email_ingest_queue_updated_at
  before update on public.email_ingest_queue
  for each row execute function public.set_updated_at();

-- Claims a small batch of pending rows and dispatches each to the
-- fetch-outlook-message Edge Function via pg_net, authenticated with the
-- service-role key stored in Vault under the name 'service_role_key' (see
-- README for the one-time manual `vault.create_secret` step — the key
-- itself must never appear in a migration).
create function public.claim_and_dispatch_email_queue()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
  v_service_role_key text;
  v_function_url text := 'https://vwhykufuqumrumhzwujx.supabase.co/functions/v1/fetch-outlook-message';
begin
  select decrypted_secret into v_service_role_key
  from vault.decrypted_secrets
  where name = 'service_role_key';

  if v_service_role_key is null then
    raise notice 'service_role_key not found in Vault; skipping dispatch';
    return;
  end if;

  for v_row in
    update public.email_ingest_queue
    set status = 'processing'
    where id in (
      select id from public.email_ingest_queue
      where status = 'pending'
      order by created_at
      limit 10
      for update skip locked
    )
    returning id, connection_id, graph_message_id
  loop
    perform net.http_post(
      url := v_function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_role_key
      ),
      body := jsonb_build_object(
        'queue_id', v_row.id,
        'connection_id', v_row.connection_id,
        'graph_message_id', v_row.graph_message_id
      )
    );
  end loop;
end;
$$;

create function public.mark_email_queue_failed(p_queue_id uuid, p_error text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.email_ingest_queue
  set status = 'failed', attempts = attempts + 1, last_error = p_error
  where id = p_queue_id;
$$;

revoke execute on function public.claim_and_dispatch_email_queue() from public;
revoke execute on function public.mark_email_queue_failed(uuid, text) from public;

grant execute on function public.claim_and_dispatch_email_queue() to service_role;
grant execute on function public.mark_email_queue_failed(uuid, text) to service_role;
