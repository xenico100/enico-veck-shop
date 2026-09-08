create extension if not exists pgcrypto;

create table if not exists public.bio_village_chat_messages (
  id uuid primary key default gen_random_uuid(),
  room text not null default 'bio-village',
  actor_id text not null,
  author text not null,
  body text not null,
  user_id uuid references auth.users on delete set null,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  constraint bio_village_chat_messages_room_length_check
    check (char_length(room) between 1 and 64),
  constraint bio_village_chat_messages_room_format_check
    check (room ~ '^[a-z0-9:_-]+$'),
  constraint bio_village_chat_messages_actor_id_length_check
    check (char_length(actor_id) between 1 and 96),
  constraint bio_village_chat_messages_author_length_check
    check (char_length(author) between 1 and 40),
  constraint bio_village_chat_messages_body_length_check
    check (char_length(body) between 1 and 72)
);

create index if not exists bio_village_chat_messages_room_created_at_idx
  on public.bio_village_chat_messages (room, created_at desc, id desc);

create index if not exists bio_village_chat_messages_created_at_idx
  on public.bio_village_chat_messages (created_at desc);

alter table public.bio_village_chat_messages enable row level security;

revoke all on table public.bio_village_chat_messages from anon, authenticated;
grant select, insert, delete on table public.bio_village_chat_messages to service_role;

create or replace function public.prune_bio_village_chat_messages(
  p_room text default 'bio-village',
  p_retention_minutes integer default 360,
  p_keep_recent integer default 300
)
returns integer
language plpgsql
set search_path = public
as $$
declare
  deleted_count integer := 0;
begin
  with expired as (
    delete from public.bio_village_chat_messages
    where room = coalesce(nullif(p_room, ''), 'bio-village')
      and created_at < now() - make_interval(mins => greatest(5, coalesce(p_retention_minutes, 360)))
    returning 1
  ),
  overflow as (
    select id
    from (
      select
        id,
        row_number() over (order by created_at desc, id desc) as row_number
      from public.bio_village_chat_messages
      where room = coalesce(nullif(p_room, ''), 'bio-village')
    ) ranked
    where row_number > greatest(1, coalesce(p_keep_recent, 300))
  ),
  trimmed as (
    delete from public.bio_village_chat_messages messages
    using overflow
    where messages.id = overflow.id
    returning 1
  )
  select
    coalesce((select count(*) from expired), 0) +
    coalesce((select count(*) from trimmed), 0)
  into deleted_count;

  return deleted_count;
end;
$$;

revoke all on function public.prune_bio_village_chat_messages(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.prune_bio_village_chat_messages(text, integer, integer)
  to service_role;

comment on table public.bio_village_chat_messages is
  'Short-lived Bio Village chat history used for lightweight reconnect history.';
comment on function public.prune_bio_village_chat_messages(text, integer, integer) is
  'Deletes stale Bio Village chat messages and caps per-room rows to keep reads fast.';
create table if not exists public.bio_village_player_states (
  participant_key text primary key,
  room text not null default 'bio-village',
  label text not null,
  x double precision not null,
  y double precision not null,
  vx double precision not null default 0,
  vy double precision not null default 0,
  dir text not null default 'down',
  palette text not null default 'crimson',
  preset text not null default 'archivist',
  profile jsonb not null default '{}'::jsonb,
  latest_poop jsonb,
  user_id uuid references auth.users on delete set null,
  updated_at timestamp with time zone not null default now(),
  constraint bio_village_player_states_room_length_check
    check (char_length(room) between 1 and 64),
  constraint bio_village_player_states_room_format_check
    check (room ~ '^[a-z0-9:_-]+$'),
  constraint bio_village_player_states_participant_key_length_check
    check (char_length(participant_key) between 1 and 96),
  constraint bio_village_player_states_label_length_check
    check (char_length(label) between 1 and 40),
  constraint bio_village_player_states_dir_check
    check (dir in ('down', 'left', 'right', 'up')),
  constraint bio_village_player_states_palette_check
    check (palette in ('amber', 'cobalt', 'crimson', 'jade', 'violet')),
  constraint bio_village_player_states_preset_check
    check (preset in ('archivist', 'courier', 'ghost', 'medic'))
);

create index if not exists bio_village_player_states_room_updated_at_idx
  on public.bio_village_player_states (room, updated_at desc);

alter table public.bio_village_player_states enable row level security;

revoke all on table public.bio_village_player_states from anon, authenticated;
grant select, insert, update, delete on table public.bio_village_player_states
  to service_role;

create or replace function public.prune_bio_village_player_states(
  p_room text default 'bio-village',
  p_stale_seconds integer default 45
)
returns integer
language plpgsql
set search_path = public
as $$
declare
  deleted_count integer := 0;
begin
  delete from public.bio_village_player_states
  where room = coalesce(nullif(p_room, ''), 'bio-village')
    and updated_at < now() - make_interval(secs => greatest(15, coalesce(p_stale_seconds, 45)));

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.prune_bio_village_player_states(text, integer)
  from public, anon, authenticated;
grant execute on function public.prune_bio_village_player_states(text, integer)
  to service_role;

comment on table public.bio_village_player_states is
  'Ephemeral Bio Village player positions; one row per live participant for realtime fallback.';

notify pgrst, 'reload schema';
