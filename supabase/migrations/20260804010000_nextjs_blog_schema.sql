-- Next.js blog CMS schema: categories, tags, relational posts fields, RLS, storage.

create extension if not exists pgcrypto;

-- =========================
-- Categories & tags
-- =========================
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

-- =========================
-- Evolve posts for Next.js CMS
-- =========================
alter table public.posts
  add column if not exists featured_image_url text,
  add column if not exists category_id uuid references public.categories(id) on delete set null,
  add column if not exists author_id uuid references auth.users(id) on delete set null,
  add column if not exists published_at timestamptz;

-- Keep legacy cover_image_url in sync when present
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'posts' and column_name = 'cover_image_url'
  ) then
    update public.posts
    set featured_image_url = coalesce(featured_image_url, cover_image_url)
    where featured_image_url is null and cover_image_url is not null;
  end if;
end
$$;

-- url was historically required; allow CMS drafts without a public URL
alter table public.posts alter column url drop not null;

update public.posts
set url = coalesce(url, '/blog/' || slug)
where url is null;

alter table public.posts
  drop constraint if exists posts_status_check;

alter table public.posts
  add constraint posts_status_check
  check (status is null or status in ('draft', 'published', 'scheduled'));

create index if not exists posts_category_id_idx on public.posts (category_id);
create index if not exists posts_author_id_idx on public.posts (author_id);
create index if not exists posts_published_at_idx on public.posts (published_at desc nulls last);
create index if not exists posts_status_published_at_idx on public.posts (status, published_at desc);

create table if not exists public.post_tags (
  post_id bigint not null references public.posts(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (post_id, tag_id)
);

create index if not exists post_tags_tag_id_idx on public.post_tags (tag_id);

-- Backfill published_at for already-published posts
update public.posts
set published_at = coalesce(published_at, updated_at, created_at)
where coalesce(status, 'draft') = 'published'
  and published_at is null;

-- =========================
-- Row Level Security
-- =========================
alter table public.categories enable row level security;
alter table public.tags enable row level security;
alter table public.post_tags enable row level security;
alter table public.posts enable row level security;

-- Categories: public read, authenticated write
drop policy if exists categories_public_read on public.categories;
create policy categories_public_read
on public.categories for select
to anon, authenticated
using (true);

drop policy if exists categories_admin_insert on public.categories;
create policy categories_admin_insert
on public.categories for insert
to authenticated
with check (true);

drop policy if exists categories_admin_update on public.categories;
create policy categories_admin_update
on public.categories for update
to authenticated
using (true)
with check (true);

drop policy if exists categories_admin_delete on public.categories;
create policy categories_admin_delete
on public.categories for delete
to authenticated
using (true);

-- Tags: public read, authenticated write
drop policy if exists tags_public_read on public.tags;
create policy tags_public_read
on public.tags for select
to anon, authenticated
using (true);

drop policy if exists tags_admin_insert on public.tags;
create policy tags_admin_insert
on public.tags for insert
to authenticated
with check (true);

drop policy if exists tags_admin_update on public.tags;
create policy tags_admin_update
on public.tags for update
to authenticated
using (true)
with check (true);

drop policy if exists tags_admin_delete on public.tags;
create policy tags_admin_delete
on public.tags for delete
to authenticated
using (true);

-- Post tags join: public read published posts' tags; authenticated full CRUD
drop policy if exists post_tags_public_read on public.post_tags;
create policy post_tags_public_read
on public.post_tags for select
to anon, authenticated
using (
  exists (
    select 1 from public.posts p
    where p.id = post_id
      and (
        auth.role() = 'authenticated'
        or (
          coalesce(p.published, false) = true
          and coalesce(p.status, 'draft') = 'published'
          and (p.published_at is null or p.published_at <= now())
        )
      )
  )
);

drop policy if exists post_tags_admin_insert on public.post_tags;
create policy post_tags_admin_insert
on public.post_tags for insert
to authenticated
with check (true);

drop policy if exists post_tags_admin_update on public.post_tags;
create policy post_tags_admin_update
on public.post_tags for update
to authenticated
using (true)
with check (true);

drop policy if exists post_tags_admin_delete on public.post_tags;
create policy post_tags_admin_delete
on public.post_tags for delete
to authenticated
using (true);

-- Posts: public reads published only; authenticated CRUD everything
drop policy if exists posts_read_public on public.posts;
drop policy if exists posts_read_published on public.posts;
drop policy if exists posts_admin_select on public.posts;
drop policy if exists posts_admin_insert on public.posts;
drop policy if exists posts_admin_update on public.posts;
drop policy if exists posts_admin_delete on public.posts;

create policy posts_public_read_published
on public.posts for select
to anon
using (
  coalesce(published, false) = true
  and coalesce(status, 'draft') = 'published'
  and (published_at is null or published_at <= now())
);

create policy posts_authenticated_select
on public.posts for select
to authenticated
using (true);

create policy posts_authenticated_insert
on public.posts for insert
to authenticated
with check (true);

create policy posts_authenticated_update
on public.posts for update
to authenticated
using (true)
with check (true);

create policy posts_authenticated_delete
on public.posts for delete
to authenticated
using (true);

-- =========================
-- Storage bucket for media
-- =========================
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
on storage.objects for select
to anon, authenticated
using (bucket_id = 'blog-images');

drop policy if exists blog_images_authenticated_insert on storage.objects;
create policy blog_images_authenticated_insert
on storage.objects for insert
to authenticated
with check (bucket_id = 'blog-images');

drop policy if exists blog_images_authenticated_update on storage.objects;
create policy blog_images_authenticated_update
on storage.objects for update
to authenticated
using (bucket_id = 'blog-images')
with check (bucket_id = 'blog-images');

drop policy if exists blog_images_authenticated_delete on storage.objects;
create policy blog_images_authenticated_delete
on storage.objects for delete
to authenticated
using (bucket_id = 'blog-images');

notify pgrst, 'reload schema';
