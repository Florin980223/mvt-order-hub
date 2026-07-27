create policy "profiles_select_admin" on public.profiles
  for select using (public.is_admin());
