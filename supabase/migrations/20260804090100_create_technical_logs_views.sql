-- Technical-logs views (brief 2.2 "Vede loguri tehnice": Operator
-- "Limitat", Admin full). Row visibility is the same for both roles (no
-- per-user ownership concept exists anywhere else in this app to split
-- rows by) — the restriction is column-level: the free-text error/
-- last_error detail is redacted to non-admins, replaced by a has_error
-- boolean. Plain RLS can't express column-level redaction, hence a view.
--
-- These views deliberately run with the view owner's privileges (default
-- Postgres view behavior, `security_invoker` left at its default of
-- false) rather than the querying user's — that's what lets an Operator
-- session read past email_ingest_queue's own admin-only table RLS. The
-- `where public.is_active_profile()` clause below is therefore the real
-- access gate for these views, not the underlying tables' RLS.

create view public.extraction_jobs_log as
select
  id,
  email_id,
  mode,
  status,
  attempts,
  case when public.is_admin() then error else null end as error,
  (error is not null) as has_error,
  started_at,
  finished_at,
  created_at
from public.extraction_jobs
where public.is_active_profile();

create view public.email_ingest_queue_log as
select
  id,
  connection_id,
  graph_message_id,
  resource,
  status,
  attempts,
  case when public.is_admin() then last_error else null end as last_error,
  (last_error is not null) as has_error,
  created_at,
  updated_at
from public.email_ingest_queue
where public.is_active_profile();

create view public.submission_jobs_log as
select
  id,
  order_id,
  mode,
  status,
  external_id,
  case when public.is_admin() then error else null end as error,
  (error is not null) as has_error,
  created_at,
  updated_at
from public.submission_jobs
where public.is_active_profile();

grant select on public.extraction_jobs_log to authenticated;
grant select on public.email_ingest_queue_log to authenticated;
grant select on public.submission_jobs_log to authenticated;
