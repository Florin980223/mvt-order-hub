create extension if not exists pg_cron;

create function public.dispatch_renew_subscriptions()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_service_role_key text;
  v_function_url text := 'https://vwhykufuqumrumhzwujx.supabase.co/functions/v1/renew-graph-subscription';
begin
  select decrypted_secret into v_service_role_key
  from vault.decrypted_secrets
  where name = 'service_role_key';

  if v_service_role_key is null then
    raise notice 'service_role_key not found in Vault; skipping renewal dispatch';
    return;
  end if;

  perform net.http_post(
    url := v_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_role_key
    ),
    body := '{}'::jsonb
  );
end;
$$;

revoke execute on function public.dispatch_renew_subscriptions() from public;
grant execute on function public.dispatch_renew_subscriptions() to service_role;

select cron.schedule(
  'dispatch-email-ingest-queue',
  '* * * * *',
  $$ select public.claim_and_dispatch_email_queue(); $$
);

select cron.schedule(
  'renew-graph-subscriptions',
  '0 */6 * * *',
  $$ select public.dispatch_renew_subscriptions(); $$
);
