-- Migration: Add latitude/longitude to public.users
-- Run this in Supabase SQL editor or via supabase CLI

begin;

alter table if exists public.users
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

-- Optional: index for geo queries (simple btree is fine for range filters)
create index if not exists users_latitude_idx on public.users (latitude);
create index if not exists users_longitude_idx on public.users (longitude);

commit;


