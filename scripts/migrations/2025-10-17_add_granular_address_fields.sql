-- Migration: Add granular address fields to public.users
-- Run this in Supabase SQL editor or via supabase CLI

begin;

alter table if exists public.users
  add column if not exists address_house text,
  add column if not exists address_street text,
  add column if not exists address_barangay text,
  add column if not exists address_subdivision text,
  add column if not exists address_landmark text,
  add column if not exists delivery_instructions text;

-- Optional: simple trigram index to speed up locality searches (if pg_trgm is enabled)
-- create extension if not exists pg_trgm;
-- create index if not exists users_address_barangay_trgm_idx on public.users using gin (address_barangay gin_trgm_ops);

commit;


