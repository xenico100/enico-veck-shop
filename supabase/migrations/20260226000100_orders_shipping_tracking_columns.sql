alter table public.orders
  add column if not exists shipping_carrier text,
  add column if not exists shipping_status text;

update public.orders
set shipping_status = case
  when coalesce(nullif(trim(tracking_number), ''), null) is not null then 'shipped'
  else 'preparing'
end
where shipping_status is null;
