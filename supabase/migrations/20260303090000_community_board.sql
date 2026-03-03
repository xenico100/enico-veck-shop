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
