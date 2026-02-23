alter table public.users enable row level security;

drop policy if exists "Can insert own user data." on public.users;
create policy "Can insert own user data." on public.users
for insert to authenticated
with check (auth.uid() = id);

-- Tighten update policy to ensure the user cannot change the row owner during updates.
drop policy if exists "Can update own user data." on public.users;
create policy "Can update own user data." on public.users
for update to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);
