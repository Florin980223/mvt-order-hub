-- Discovered while browser-verifying Phase 5b: EmailsPage is the first
-- real data-driven page in the app, and its query hit 403 "permission
-- denied" for the *authenticated* role (the role real logged-in browser
-- sessions run as) on emails/profiles — same root cause as the
-- service_role grants bug (20260728090100), just never exercised before
-- since no page had queried real data yet. Confirmed via
-- information_schema.role_table_grants: authenticated/anon only had
-- REFERENCES/TRIGGER/TRUNCATE on every Phase 3 table, no
-- SELECT/INSERT/UPDATE/DELETE at all.
--
-- Granting broad CRUD here is safe: `authenticated` has no BYPASSRLS,
-- so every actual operation still passes through the existing RLS
-- policies (which today only define SELECT policies for these tables —
-- writes remain blocked at the RLS layer, exactly as intended, since
-- writes happen via Edge Functions using the service role).
grant usage on schema public to authenticated;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select, update on all sequences in schema public to authenticated;
grant execute on all functions in schema public to authenticated;

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant usage, select, update on sequences to authenticated;
alter default privileges in schema public
  grant execute on functions to authenticated;
