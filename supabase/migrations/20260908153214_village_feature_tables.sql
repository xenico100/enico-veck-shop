-- Restore the existing village feature schema without changing the configured database.
create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  title text not null check (char_length(trim(title)) between 1 and 160),
  content text not null check (char_length(trim(content)) between 1 and 10000),
  is_notice boolean not null default false,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now())
);

create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.community_posts(id) on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  content text not null check (char_length(trim(content)) between 1 and 2000),
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now())
);

create index if not exists community_posts_notice_created_idx
  on public.community_posts (is_notice desc, created_at desc);

create index if not exists community_posts_user_created_idx
  on public.community_posts (user_id, created_at desc);

create index if not exists community_comments_post_created_idx
  on public.community_comments (post_id, created_at asc);

create index if not exists community_comments_user_created_idx
  on public.community_comments (user_id, created_at desc);

create or replace function public.set_community_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists set_community_posts_updated_at on public.community_posts;
create trigger set_community_posts_updated_at
before update on public.community_posts
for each row
execute function public.set_community_updated_at();

drop trigger if exists set_community_comments_updated_at on public.community_comments;
create trigger set_community_comments_updated_at
before update on public.community_comments
for each row
execute function public.set_community_updated_at();

alter table public.community_posts enable row level security;
alter table public.community_comments enable row level security;

drop policy if exists "community_posts_select_all" on public.community_posts;
create policy "community_posts_select_all"
on public.community_posts
for select
using (true);

drop policy if exists "community_posts_insert_member" on public.community_posts;
create policy "community_posts_insert_member"
on public.community_posts
for insert
to authenticated
with check (auth.uid() = user_id and is_notice = false);

drop policy if exists "community_posts_update_own_non_notice" on public.community_posts;
create policy "community_posts_update_own_non_notice"
on public.community_posts
for update
to authenticated
using (auth.uid() = user_id and is_notice = false)
with check (auth.uid() = user_id and is_notice = false);

drop policy if exists "community_posts_delete_own_non_notice" on public.community_posts;
create policy "community_posts_delete_own_non_notice"
on public.community_posts
for delete
to authenticated
using (auth.uid() = user_id and is_notice = false);

drop policy if exists "community_comments_select_all" on public.community_comments;
create policy "community_comments_select_all"
on public.community_comments
for select
using (true);

drop policy if exists "community_comments_insert_own" on public.community_comments;
create policy "community_comments_insert_own"
on public.community_comments
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "community_comments_update_own" on public.community_comments;
create policy "community_comments_update_own"
on public.community_comments
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "community_comments_delete_own" on public.community_comments;
create policy "community_comments_delete_own"
on public.community_comments
for delete
to authenticated
using (auth.uid() = user_id);

create table if not exists public.community_post_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.community_posts(id) on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  reaction text not null check (reaction in ('like', 'dislike')),
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now()),
  unique (post_id, user_id)
);

create index if not exists community_post_reactions_post_idx
  on public.community_post_reactions (post_id);

create index if not exists community_post_reactions_user_created_idx
  on public.community_post_reactions (user_id, created_at desc);

create index if not exists community_post_reactions_post_reaction_idx
  on public.community_post_reactions (post_id, reaction);

drop trigger if exists set_community_post_reactions_updated_at on public.community_post_reactions;
create trigger set_community_post_reactions_updated_at
before update on public.community_post_reactions
for each row
execute function public.set_community_updated_at();

alter table public.community_post_reactions enable row level security;

drop policy if exists "community_post_reactions_select_all" on public.community_post_reactions;
create policy "community_post_reactions_select_all"
on public.community_post_reactions
for select
using (true);

drop policy if exists "community_post_reactions_insert_own" on public.community_post_reactions;
create policy "community_post_reactions_insert_own"
on public.community_post_reactions
for insert
to authenticated
with check (auth.uid() = user_id and reaction in ('like', 'dislike'));

drop policy if exists "community_post_reactions_update_own" on public.community_post_reactions;
create policy "community_post_reactions_update_own"
on public.community_post_reactions
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id and reaction in ('like', 'dislike'));

drop policy if exists "community_post_reactions_delete_own" on public.community_post_reactions;
create policy "community_post_reactions_delete_own"
on public.community_post_reactions
for delete
to authenticated
using (auth.uid() = user_id);

alter table public.community_comments alter column user_id drop not null;
alter table public.community_comments add column if not exists anonymous_name text check (char_length(trim(anonymous_name)) between 1 and 30);

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

alter table public.service_posts
  add column if not exists is_paid_file boolean not null default false,
  add column if not exists file_price numeric,
  add column if not exists download_file_url text;

comment on column public.service_posts.is_paid_file is 'Whether this service post includes a paid downloadable 3D file.';
comment on column public.service_posts.file_price is 'Price for the downloadable paid file. Uses the same currency column as the service post.';
comment on column public.service_posts.download_file_url is 'Cloudflare R2 object key for the downloadable paid file.';

create table if not exists public.service_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  service_post_id uuid not null references public.service_posts(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  paypal_order_id text,
  amount_paid numeric,
  currency text,
  status text not null default 'completed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists service_purchases_user_post_key
  on public.service_purchases (user_id, service_post_id);

create index if not exists service_purchases_user_created_idx
  on public.service_purchases (user_id, created_at desc);

create index if not exists service_purchases_service_post_idx
  on public.service_purchases (service_post_id, created_at desc);

create index if not exists service_purchases_paypal_order_id_idx
  on public.service_purchases (paypal_order_id);

create or replace function public.set_service_purchases_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_service_purchases_updated_at on public.service_purchases;
create trigger trg_service_purchases_updated_at
before update on public.service_purchases
for each row
execute function public.set_service_purchases_updated_at();

alter table public.service_purchases enable row level security;

drop policy if exists "service_purchases_select_own" on public.service_purchases;
create policy "service_purchases_select_own"
on public.service_purchases
for select
to authenticated
using (auth.uid() = user_id);

/**
* STUDIO POSTS
* Note: public read access, authenticated users can insert their own posts.
*/
create table if not exists studio_posts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  title text not null,
  content text not null,
  image_url text not null,
  required_membership_level smallint not null default 0,
  user_id uuid references auth.users not null
);

alter table studio_posts enable row level security;

drop policy if exists "Allow public read-only access." on public.studio_posts;
create policy "Allow public read-only access." on studio_posts
  for select using (required_membership_level = 0 or auth.uid() = user_id);

drop policy if exists "Allow authenticated users to insert studio posts." on public.studio_posts;
create policy "Allow authenticated users to insert studio posts." on studio_posts
  for insert with check (auth.uid() = user_id);

alter table public.studio_posts
  add column if not exists required_membership_level smallint not null default 0;

update public.studio_posts
set required_membership_level = 0
where required_membership_level is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'studio_posts_required_membership_level_check'
  ) then
    alter table public.studio_posts
      add constraint studio_posts_required_membership_level_check
      check (required_membership_level between 0 and 3);
  end if;
end $$;

create index if not exists studio_posts_required_membership_level_idx
  on public.studio_posts (required_membership_level, created_at desc);

alter function public.set_community_updated_at() set search_path = public;
alter function public.set_service_posts_updated_at() set search_path = public;
alter function public.set_service_purchases_updated_at() set search_path = public;
grant select on public.community_posts, public.community_comments, public.community_post_reactions, public.service_posts, public.studio_posts to anon, authenticated;
grant insert, update, delete on public.community_posts, public.community_comments, public.community_post_reactions, public.service_posts, public.studio_posts to authenticated;
grant select on public.service_purchases to authenticated;
grant all on public.community_posts, public.community_comments, public.community_post_reactions, public.service_posts, public.studio_posts, public.service_purchases to service_role;
notify pgrst, 'reload schema';
