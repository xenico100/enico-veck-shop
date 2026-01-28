/**
* STUDIO POSTS
* Note: public read access, authenticated users can insert their own posts.
*/
create table if not exists studio_posts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  title text not null,
  content text not null,
  image_url text not null,
  user_id uuid references auth.users not null
);

alter table studio_posts enable row level security;

create policy "Allow public read-only access." on studio_posts
  for select using (true);

create policy "Allow authenticated users to insert studio posts." on studio_posts
  for insert with check (auth.uid() = user_id);
