-- Header "Conectat la Outlook" pill (brief 10.1) is required for every
-- active profile, not just admins — but mail_connections_select_admin
-- must keep guarding token_ref (a secret-store reference) from non-admin
-- sessions. Same shape as the technical_logs_* views: a narrow,
-- non-security-invoker view exposing only the display-safe columns,
-- gated by is_active_profile() instead of the base table's admin-only RLS.
-- created_at is included because useMailConnectionQuery orders by it to
-- pick "the" connection when more than one row exists.
create view public.mail_connection_status as
select
  id,
  mailbox_address,
  status,
  last_sync_at,
  created_at
from public.mail_connections
where public.is_active_profile();

grant select on public.mail_connection_status to authenticated;
