alter table public.orders
  add column if not exists items jsonb not null default '[]'::jsonb,
  add column if not exists paypal_order_id text,
  add column if not exists total_amount bigint,
  add column if not exists shipping_address jsonb not null default '{}'::jsonb,
  add column if not exists tracking_number text;

update public.orders
set total_amount = amount_total
where total_amount is null and amount_total is not null;

update public.orders
set shipping_address = '{}'::jsonb
where shipping_address is null;

create unique index if not exists orders_paypal_order_id_key
  on public.orders (paypal_order_id)
  where paypal_order_id is not null;

alter table public.orders enable row level security;

drop policy if exists "orders_insert_own" on public.orders;
create policy "orders_insert_own"
on public.orders
for insert
with check (auth.uid() = user_id);
