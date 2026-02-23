create extension if not exists pgcrypto;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending',
  currency text,
  amount_total bigint,
  created_at timestamptz not null default now(),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  items jsonb not null default '[]'::jsonb,
  metadata jsonb
);

create index if not exists orders_user_id_created_at_idx on public.orders(user_id, created_at desc);
create index if not exists orders_status_created_at_idx on public.orders(status, created_at desc);

alter table public.orders enable row level security;

drop policy if exists "orders_select_own" on public.orders;
create policy "orders_select_own"
on public.orders
for select
using (auth.uid() = user_id);

drop policy if exists "orders_select_admin_all" on public.orders;
create policy "orders_select_admin_all"
on public.orders
for select
using (
  coalesce((auth.jwt() ->> 'email'), '') = 'morba9850@gmail.com'
  or coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin'
  or coalesce((auth.jwt() -> 'user_metadata' ->> 'role'), '') = 'admin'
);
