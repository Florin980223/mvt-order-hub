-- is_admin() is now used by profiles_select_admin, a policy ON
-- public.profiles itself. Without `security definer`, is_admin()'s own
-- internal `select ... from public.profiles` runs under RLS as the
-- calling user, which re-evaluates profiles_select_admin, which calls
-- is_admin() again — infinite recursion ("stack depth limit exceeded").
-- security definer makes that internal lookup run as the function owner,
-- bypassing profiles' RLS entirely and breaking the loop — same pattern
-- already used elsewhere in this codebase (handle_new_user,
-- store_mail_connection_secret, etc.).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and active
  );
$$;
