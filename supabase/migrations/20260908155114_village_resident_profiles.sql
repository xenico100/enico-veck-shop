create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  name text,
  phone text,
  address text,
  avatar_url text,
  billing_address jsonb,
  payment_method jsonb
);
alter table public.users enable row level security;
drop policy if exists village_users_read_own on public.users;
create policy village_users_read_own on public.users for select to authenticated using ((select auth.uid()) = id);
drop policy if exists village_users_insert_own on public.users;
create policy village_users_insert_own on public.users for insert to authenticated with check ((select auth.uid()) = id);
drop policy if exists village_users_update_own on public.users;
create policy village_users_update_own on public.users for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
grant select, insert, update on public.users to authenticated;
grant all on public.users to service_role;
insert into public.users (id, full_name, name, avatar_url)
select id, raw_user_meta_data->>'full_name', coalesce(raw_user_meta_data->>'name', raw_user_meta_data->>'full_name'), raw_user_meta_data->>'avatar_url'
from auth.users on conflict (id) do nothing;
notify pgrst, 'reload schema';
