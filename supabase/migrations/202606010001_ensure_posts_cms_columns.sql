-- Ensure CMS columns exist on posts (fixes GitHub import / PostgREST schema cache errors).
-- Safe to run multiple times.

alter table public.posts
  add column if not exists category text,
  add column if not exists content text,
  add column if not exists excerpt text,
  add column if not exists emoji text default '💜',
  add column if not exists published boolean not null default false,
  add column if not exists status text default 'draft';

update public.posts
set
  excerpt = coalesce(excerpt, summary),
  published = true,
  status = 'published'
where excerpt is null
  and summary is not null;

-- Refresh PostgREST schema cache so /rest/v1/posts sees new columns immediately.
notify pgrst, 'reload schema';
