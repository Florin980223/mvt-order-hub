-- Phase 6b: non-secret outbound API config lives in app_settings (the
-- `encrypted` column is informational only — real credentials stay in
-- Edge Function env vars, see submit-order). There's no Settings UI yet
-- to write this row, so it's seeded here; the submit-order function
-- reads it but doesn't dispatch a real HTTP call this phase (stubbed),
-- so the URL is a placeholder pending an approved outbound target.
insert into public.app_settings (key, value_json, encrypted)
values ('outbound_api', '{"url": "https://example.invalid/outbound-api-not-yet-configured"}'::jsonb, false)
on conflict (key) do nothing;
