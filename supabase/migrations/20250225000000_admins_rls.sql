alter table public.admins enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'admins'
      and policyname = 'Admins can read own row'
  ) then
    create policy "Admins can read own row" on public.admins
      for select
      using (auth.uid() = user_id);
  end if;
end $$;
