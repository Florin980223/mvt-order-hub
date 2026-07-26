-- Discovered while testing 20260729090000: there are two real
-- mail_connections rows from Phase 4a OAuth testing (an early guest-style
-- address, then a cleaner reconnect). "First created" surfaced the
-- messier one. Prefer the most recently created *connected* mailbox
-- instead — the one actually in use after a reconnect.
create or replace function public.get_primary_mailbox_address()
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_active_profile() then
    return null;
  end if;
  return (
    select mailbox_address
    from public.mail_connections
    where status = 'connected'
    order by created_at desc
    limit 1
  );
end;
$$;
