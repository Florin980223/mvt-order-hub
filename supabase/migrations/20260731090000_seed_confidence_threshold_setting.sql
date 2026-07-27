-- Admin-configurable confidence threshold (brief 5.4: recommended default
-- 0.85). Replaces the hardcoded 0.6/0.85 constants scattered across
-- orderFields.ts, ConfidenceBadge.tsx, and process-email-job.
insert into public.app_settings (key, value_json, encrypted)
values ('confidence_threshold', '{"threshold": 0.85}'::jsonb, false)
on conflict (key) do nothing;
