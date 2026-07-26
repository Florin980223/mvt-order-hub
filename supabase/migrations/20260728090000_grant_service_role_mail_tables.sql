-- service_role's BYPASSRLS attribute skips row-level security policy
-- checks, but does not imply a base object-level GRANT — without this,
-- Edge Functions using the service-role key hit "permission denied for
-- table" even though they're correctly authenticated as service_role.
grant select, insert, update, delete on public.mail_connections to service_role;
grant select, insert, update, delete on public.graph_subscriptions to service_role;
grant select, insert, update, delete on public.email_ingest_queue to service_role;
