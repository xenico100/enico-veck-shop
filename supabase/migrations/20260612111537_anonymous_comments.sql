alter table public.community_comments alter column user_id drop not null;
alter table public.community_comments add column anonymous_name text check (char_length(trim(anonymous_name)) between 1 and 30);
