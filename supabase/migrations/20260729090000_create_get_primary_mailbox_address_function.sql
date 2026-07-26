-- mail_connections is admin-only via RLS (mail_connections_select_admin),
-- since tenant_id/token_ref are sensitive — but the mailbox address itself
-- isn't a secret, and the "Emailuri noi" detail panel needs it for the
-- To field for every active profile, not just admins. Exposes just that
-- one column via a security-definer function, same pattern as the
-- existing is_admin()/is_active_profile() helpers.
--
-- Picks the first-created connection as "primary" — a simplification
-- matching Phase 4a's single-mailbox OAuth design; would need revisiting
-- if multi-mailbox support is ever added.
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
  return (select mailbox_address from public.mail_connections order by created_at asc limit 1);
end;
$$;

revoke all on function public.get_primary_mailbox_address() from public;
grant execute on function public.get_primary_mailbox_address() to authenticated;
