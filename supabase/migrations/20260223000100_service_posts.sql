create extension if not exists pgcrypto;

create table if not exists public.service_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique,
  category text,
  summary text,
  content text,
  price_from integer,
  currency text not null default 'KRW',
  image_urls text[] not null default '{}',
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create index if not exists service_posts_category_idx on public.service_posts (category);
create index if not exists service_posts_published_idx on public.service_posts (is_published, updated_at desc);
create index if not exists service_posts_created_by_idx on public.service_posts (created_by);

create or replace function public.set_service_posts_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_service_posts_updated_at on public.service_posts;
create trigger trg_service_posts_updated_at
before update on public.service_posts
for each row
execute function public.set_service_posts_updated_at();

alter table public.service_posts enable row level security;

drop policy if exists "service_posts_public_select_published" on public.service_posts;
create policy "service_posts_public_select_published"
on public.service_posts
for select
using (is_published = true);

drop policy if exists "service_posts_owner_insert" on public.service_posts;
create policy "service_posts_owner_insert"
on public.service_posts
for insert
to authenticated
with check (auth.uid() = created_by);

drop policy if exists "service_posts_owner_update" on public.service_posts;
create policy "service_posts_owner_update"
on public.service_posts
for update
to authenticated
using (auth.uid() = created_by)
with check (auth.uid() = created_by);

drop policy if exists "service_posts_owner_delete" on public.service_posts;
create policy "service_posts_owner_delete"
on public.service_posts
for delete
to authenticated
using (auth.uid() = created_by);

insert into storage.buckets (id, name, public)
values ('service-images', 'service-images', true)
on conflict (id) do nothing;

drop policy if exists "service_images_public_read" on storage.objects;
create policy "service_images_public_read"
on storage.objects
for select
using (bucket_id = 'service-images');

drop policy if exists "service_images_owner_insert" on storage.objects;
create policy "service_images_owner_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'service-images'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "service_images_owner_update" on storage.objects;
create policy "service_images_owner_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'service-images'
  and split_part(name, '/', 1) = auth.uid()::text
)
with check (
  bucket_id = 'service-images'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "service_images_owner_delete" on storage.objects;
create policy "service_images_owner_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'service-images'
  and split_part(name, '/', 1) = auth.uid()::text
);
