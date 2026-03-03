create extension if not exists pgcrypto;

create table if not exists public.site_daily_visits (
  id uuid primary key default gen_random_uuid(),
  visit_date date not null,
  visitor_id text not null check (char_length(visitor_id) between 8 and 128),
  user_id uuid references auth.users on delete set null,
  last_path text,
  user_agent text,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now()),
  unique (visit_date, visitor_id)
);

create index if not exists site_daily_visits_visit_date_idx
  on public.site_daily_visits (visit_date desc);

create index if not exists site_daily_visits_user_date_idx
  on public.site_daily_visits (user_id, visit_date desc);

create or replace function public.set_site_daily_visits_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists set_site_daily_visits_updated_at on public.site_daily_visits;
create trigger set_site_daily_visits_updated_at
before update on public.site_daily_visits
for each row
execute function public.set_site_daily_visits_updated_at();

alter table public.site_daily_visits enable row level security;
