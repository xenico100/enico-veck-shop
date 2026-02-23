alter table users
add column if not exists name text,
add column if not exists phone text,
add column if not exists address text;
