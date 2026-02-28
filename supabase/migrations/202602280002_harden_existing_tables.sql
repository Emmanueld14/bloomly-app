-- Compatibility hardening for pre-existing tables.
-- Ensures current app queries/upserts work reliably.

-- The frontend uses upsert on likes with onConflict: 'post_id'.
-- Some older schemas used id PK without a unique index on post_id.
create unique index if not exists likes_post_id_unique_idx
  on public.likes (post_id);

-- Keep updated_at available for likes rows in both old/new schemas.
alter table public.likes
  add column if not exists updated_at timestamptz not null default now();
