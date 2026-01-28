/**
* POSTS
* Note: posts are public to read, but only authenticated users can write their own posts.
*/
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  title text not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table posts enable row level security;

create policy "Allow public read-only access." on posts
  for select using (true);

create policy "Allow authenticated users to insert posts." on posts
  for insert with check (auth.uid() = user_id);

create policy "Allow users to update their own posts." on posts
  for update using (auth.uid() = user_id);

create policy "Allow users to delete their own posts." on posts
  for delete using (auth.uid() = user_id);
