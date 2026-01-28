-- profiles table for mypage
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text,
  address text,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by owner" on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

create policy "Profiles are updatable by owner" on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Profiles are insertable by owner" on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

-- storage bucket for studio posts
insert into storage.buckets (id, name, public)
values ('studio', 'studio', true)
on conflict (id) do nothing;

create policy "Studio images are publicly readable"
  on storage.objects for select
  to public
  using (bucket_id = 'studio');

create policy "Studio images are insertable by authenticated users"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'studio');

create policy "Studio images are updatable by owner or admin"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'studio' and (auth.uid() = owner or public.is_admin(auth.uid())))
  with check (bucket_id = 'studio' and (auth.uid() = owner or public.is_admin(auth.uid())));

create policy "Studio images are deletable by owner or admin"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'studio' and (auth.uid() = owner or public.is_admin(auth.uid())));
