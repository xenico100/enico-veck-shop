create or replace function public.get_community_post_reaction_summary(
  p_post_id uuid,
  p_daily_since timestamp with time zone default null
)
returns table (
  like_count bigint,
  dislike_count bigint,
  daily_like_count bigint
)
language sql
stable
as $$
  select
    count(*) filter (where reaction = 'like')::bigint as like_count,
    count(*) filter (where reaction = 'dislike')::bigint as dislike_count,
    count(*) filter (
      where reaction = 'like'
        and (p_daily_since is null or updated_at >= p_daily_since)
    )::bigint as daily_like_count
  from public.community_post_reactions
  where post_id = p_post_id;
$$;

grant execute on function public.get_community_post_reaction_summary(uuid, timestamp with time zone) to anon;
grant execute on function public.get_community_post_reaction_summary(uuid, timestamp with time zone) to authenticated;
grant execute on function public.get_community_post_reaction_summary(uuid, timestamp with time zone) to service_role;

create or replace function public.get_studio_post_reaction_summary(
  p_post_id uuid
)
returns table (
  like_count bigint,
  dislike_count bigint
)
language sql
stable
as $$
  select
    count(*) filter (where reaction = 'like')::bigint as like_count,
    count(*) filter (where reaction = 'dislike')::bigint as dislike_count
  from public.studio_post_reactions
  where post_id = p_post_id;
$$;

grant execute on function public.get_studio_post_reaction_summary(uuid) to anon;
grant execute on function public.get_studio_post_reaction_summary(uuid) to authenticated;
grant execute on function public.get_studio_post_reaction_summary(uuid) to service_role;

create index if not exists community_post_reactions_post_reaction_updated_idx
  on public.community_post_reactions (post_id, reaction, updated_at desc);
