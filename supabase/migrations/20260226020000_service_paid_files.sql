alter table public.service_posts
  add column if not exists is_paid_file boolean not null default false,
  add column if not exists file_price numeric,
  add column if not exists download_file_url text;

comment on column public.service_posts.is_paid_file is 'Whether this service post includes a paid downloadable 3D file.';
comment on column public.service_posts.file_price is 'Price for the downloadable paid file. Uses the same currency column as the service post.';
comment on column public.service_posts.download_file_url is 'Cloudflare R2 object key for the downloadable paid file.';

create table if not exists public.service_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  service_post_id uuid not null references public.service_posts(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  paypal_order_id text,
  amount_paid numeric,
  currency text,
  status text not null default 'completed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists service_purchases_user_post_key
  on public.service_purchases (user_id, service_post_id);

create index if not exists service_purchases_user_created_idx
  on public.service_purchases (user_id, created_at desc);

create index if not exists service_purchases_service_post_idx
  on public.service_purchases (service_post_id, created_at desc);

create index if not exists service_purchases_paypal_order_id_idx
  on public.service_purchases (paypal_order_id);

create or replace function public.set_service_purchases_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_service_purchases_updated_at on public.service_purchases;
create trigger trg_service_purchases_updated_at
before update on public.service_purchases
for each row
execute function public.set_service_purchases_updated_at();

alter table public.service_purchases enable row level security;

drop policy if exists "service_purchases_select_own" on public.service_purchases;
create policy "service_purchases_select_own"
on public.service_purchases
for select
to authenticated
using (auth.uid() = user_id);
