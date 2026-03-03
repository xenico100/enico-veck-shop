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
