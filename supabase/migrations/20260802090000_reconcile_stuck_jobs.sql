-- Reconciles rows that got stuck mid-pipeline because the Edge Function
-- processing them crashed (or the pg_net dispatch never completed) before
-- reaching a terminal status. See fetch-outlook-message / process-email-job
-- for the normal 'done'/'succeeded'/'failed' transitions this backstops.

create function public.reconcile_stuck_email_queue()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Still has budget: requeue so claim_and_dispatch_email_queue (runs every
  -- minute) naturally re-dispatches it.
  update public.email_ingest_queue
  set status = 'pending', attempts = attempts + 1
  where status = 'processing'
    and updated_at < now() - interval '10 minutes'
    and attempts < 3;

  -- Exhausted retries: give up visibly rather than requeue forever.
  update public.email_ingest_queue
  set status = 'failed', attempts = attempts + 1, last_error = 'stuck in processing, exceeded max attempts'
  where status = 'processing'
    and updated_at < now() - interval '10 minutes'
    and attempts >= 3;
end;
$$;

-- Unlike the queue above, nothing re-dispatches process-email-job on a
-- timer, so a stuck extraction_jobs row is simply marked failed — a human
-- retries it via the retry-extraction Edge Function.
create function public.reconcile_stuck_extraction_jobs()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job record;
begin
  for v_job in
    select id, email_id
    from public.extraction_jobs
    where status = 'running'
      and started_at < now() - interval '5 minutes'
  loop
    update public.extraction_jobs
    set status = 'failed', error = 'stuck in running, reconciled by timeout', finished_at = now()
    where id = v_job.id;

    update public.emails
    set status = 'needs_validation'
    where id = v_job.email_id
      and status not in ('needs_validation', 'rejected', 'archived');
  end loop;
end;
$$;

revoke execute on function public.reconcile_stuck_email_queue() from public;
revoke execute on function public.reconcile_stuck_extraction_jobs() from public;

grant execute on function public.reconcile_stuck_email_queue() to service_role;
grant execute on function public.reconcile_stuck_extraction_jobs() to service_role;

select cron.schedule(
  'reconcile-stuck-email-queue',
  '*/5 * * * *',
  $$ select public.reconcile_stuck_email_queue(); $$
);

select cron.schedule(
  'reconcile-stuck-extraction-jobs',
  '*/5 * * * *',
  $$ select public.reconcile_stuck_extraction_jobs(); $$
);
