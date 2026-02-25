create table if not exists public.paypal_customers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  paypal_payer_id text unique,
  created_at timestamptz not null default now()
);

create table if not exists public.paypal_plans (
  id text primary key,
  name text,
  status text,
  interval text,
  amount numeric,
  currency text,
  created_at timestamptz not null default now()
);

create table if not exists public.paypal_subscriptions (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  plan_id text references public.paypal_plans(id),
  status text,
  current_period_end timestamptz,
  last_event_at timestamptz not null default now(),
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists paypal_subscriptions_user_id_idx
  on public.paypal_subscriptions (user_id);

create index if not exists paypal_subscriptions_status_idx
  on public.paypal_subscriptions (status);

create table if not exists public.studio_media (
  id uuid primary key default gen_random_uuid(),
  studio_post_id uuid not null references public.studio_posts(id) on delete cascade,
  kind text not null check (kind in ('image', 'video')),
  r2_bucket text not null,
  r2_key text not null,
  mime text,
  bytes bigint,
  created_at timestamptz not null default now()
);

create index if not exists studio_media_studio_post_id_idx
  on public.studio_media (studio_post_id);

create table if not exists public.studio_access (
  user_id uuid references auth.users(id) on delete cascade,
  has_active_subscription boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id)
);

create table if not exists public.paypal_webhook_events (
  id text primary key,
  event_type text,
  raw jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

alter table public.paypal_customers enable row level security;
alter table public.paypal_plans enable row level security;
alter table public.paypal_subscriptions enable row level security;
alter table public.studio_media enable row level security;
alter table public.studio_access enable row level security;
alter table public.paypal_webhook_events enable row level security;

drop policy if exists "paypal_subscriptions_select_own" on public.paypal_subscriptions;
create policy "paypal_subscriptions_select_own"
on public.paypal_subscriptions
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "studio_access_select_own" on public.studio_access;
create policy "studio_access_select_own"
on public.studio_access
for select
to authenticated
using (auth.uid() = user_id);

