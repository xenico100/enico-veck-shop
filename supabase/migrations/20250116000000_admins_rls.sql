alter table public.admins enable row level security;

drop policy if exists "Admins can read own row" on public.admins;

create policy "Admins can read own row"
on public.admins
for select
using (auth.uid() = user_id);
