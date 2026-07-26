-- Same root cause as 20260728090000_grant_service_role_mail_tables.sql:
-- service_role's BYPASSRLS attribute skips RLS policy checks, but does
-- not imply a base object-level GRANT. Every Phase 3 table (emails,
-- orders, email_attachments, extraction_jobs, order_field_sources,
-- order_events, submission_jobs, notifications, app_settings,
-- audit_logs, profiles) was missing this, which is why
-- npm run seed:mock-emails hit "permission denied for table emails".
--
-- Grant broadly across the whole public schema instead of patching
-- table-by-table again, and set default privileges so any table,
-- sequence, or function created by future migrations (Phase 6+)
-- is covered automatically — preventing this bug from recurring.

grant usage on schema public to service_role;

grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select, update on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;
alter default privileges in schema public
  grant usage, select, update on sequences to service_role;
alter default privileges in schema public
  grant execute on functions to service_role;
