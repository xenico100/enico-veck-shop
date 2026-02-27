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
