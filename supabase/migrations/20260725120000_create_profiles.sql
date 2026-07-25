-- Creates the profiles table (full_name, role, active) with one row per
-- auth.users row, populated automatically via trigger on signup.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role text not null default 'operator' check (role in ('admin', 'operator')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select
  using (auth.uid() = id);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, active)
  values (new.id, new.raw_user_meta_data ->> 'full_name', 'operator', true);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
