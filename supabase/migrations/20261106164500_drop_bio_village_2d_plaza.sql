-- Remove 2D pixel plaza realtime chat and player presence storage
drop function if exists public.prune_bio_village_chat_messages(text, integer, integer);
drop function if exists public.prune_bio_village_player_states(text, integer);
drop table if exists public.bio_village_chat_messages cascade;
drop table if exists public.bio_village_player_states cascade;
