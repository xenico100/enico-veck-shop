/**
* PROFILES
* Note: profiles are private to each user.
*/
create table if not exists profiles (
  id uuid references auth.users not null primary key,
  phone text,
  address text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table profiles enable row level security;

create policy "Users can view their own profile." on profiles
  for select using (auth.uid() = id);

create policy "Users can update their own profile." on profiles
  for update using (auth.uid() = id);

create policy "Users can insert their own profile." on profiles
  for insert with check (auth.uid() = id);

create function public.handle_new_profile()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created_profiles
  after insert on auth.users
  for each row execute procedure public.handle_new_profile();
