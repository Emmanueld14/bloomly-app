-- Rich CMS editor storage and post content columns.
-- Tiptap JSON is the source of truth; HTML is generated for safe public rendering.

alter table public.posts
  add column if not exists content_json jsonb,
  add column if not exists content_html text,
  add column if not exists cover_image_url text,
  add column if not exists tags text[] not null default '{}',
  add column if not exists seo_title text,
  add column if not exists meta_description text,
  add column if not exists scheduled_at timestamptz,
  add column if not exists read_time_minutes integer not null default 1;

alter table public.posts
  drop constraint if exists posts_status_check;

alter table public.posts
  add constraint posts_status_check
  check (status in ('draft', 'published', 'scheduled'));

alter table public.posts
  drop constraint if exists posts_read_time_minutes_check;

alter table public.posts
  add constraint posts_read_time_minutes_check
  check (read_time_minutes >= 1);

create index if not exists posts_status_updated_at_idx
  on public.posts (status, updated_at desc);

create index if not exists posts_tags_idx
  on public.posts using gin (tags);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'blog-images',
  'blog-images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists blog_images_public_read on storage.objects;
create policy blog_images_public_read
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'blog-images');

-- Uploads are intentionally performed by authenticated admin Edge/Pages functions
-- using the service role key, so no broad client-side INSERT policy is created.

notify pgrst, 'reload schema';
