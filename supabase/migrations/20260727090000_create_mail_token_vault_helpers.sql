-- Vault-backed storage for Microsoft Graph access/refresh tokens.
-- mail_connections.token_ref stores the returned Vault secret UUID (as
-- text) — never a raw token. Wrapper functions are required because
-- PostgREST does not expose the `vault` schema directly; only
-- service_role may call these (Edge Functions only).
create extension if not exists supabase_vault with schema vault;

create function public.store_mail_connection_secret(p_secret_value text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  v_id := vault.create_secret(p_secret_value);
  return v_id;
end;
$$;

create function public.update_mail_connection_secret(p_token_ref uuid, p_secret_value text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform vault.update_secret(p_token_ref, p_secret_value);
end;
$$;

create function public.read_mail_connection_secret(p_token_ref uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select decrypted_secret from vault.decrypted_secrets where id = p_token_ref;
$$;

revoke execute on function public.store_mail_connection_secret(text) from public;
revoke execute on function public.update_mail_connection_secret(uuid, text) from public;
revoke execute on function public.read_mail_connection_secret(uuid) from public;

grant execute on function public.store_mail_connection_secret(text) to service_role;
grant execute on function public.update_mail_connection_secret(uuid, text) to service_role;
grant execute on function public.read_mail_connection_secret(uuid) to service_role;
