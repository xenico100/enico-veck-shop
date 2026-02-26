alter table public.studio_media
  add column if not exists is_free_public boolean not null default false;

create index if not exists studio_media_post_public_idx
  on public.studio_media (studio_post_id, is_free_public);
