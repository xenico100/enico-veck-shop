alter table public.studio_posts enable row level security;

drop policy if exists "studio_posts_select_all" on public.studio_posts;
create policy "studio_posts_select_all"
on public.studio_posts
for select
using (true);

drop policy if exists "studio_posts_insert_own" on public.studio_posts;
create policy "studio_posts_insert_own"
on public.studio_posts
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "studio_posts_update_own" on public.studio_posts;
create policy "studio_posts_update_own"
on public.studio_posts
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "studio_posts_delete_own" on public.studio_posts;
create policy "studio_posts_delete_own"
on public.studio_posts
for delete
to authenticated
using (auth.uid() = user_id);
