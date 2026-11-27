-- AI Versus Studio — Supabase schema.
-- Run in the Supabase SQL editor, then create a private storage bucket named "media"
-- (or set SUPABASE_BUCKET). The app uses the service-role key server-side only.

create table if not exists public.docs (
  collection text not null check (collection in ('settings', 'characters', 'ideas', 'projects')),
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (collection, id)
);

create index if not exists docs_collection_updated_idx on public.docs (collection, updated_at desc);

-- Lock the table down: only the service role (server) may read/write.
alter table public.docs enable row level security;
-- (no policies = no access for anon/authenticated roles)

insert into storage.buckets (id, name, public)
values ('media', 'media', false)
on conflict (id) do nothing;
