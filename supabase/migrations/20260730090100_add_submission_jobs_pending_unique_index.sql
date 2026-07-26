-- Phase 6b duplicate-submission prevention: closes the race between
-- submit-order's pre-insert check for an in-flight job and the insert
-- itself (e.g. a rapid double-click or two concurrent requests).
create unique index submission_jobs_one_in_flight_per_order_idx
  on public.submission_jobs (order_id)
  where status in ('pending', 'sent');
