-- Distinguish blog posts from resource guides in the CMS.

alter table public.posts
  add column if not exists content_type text not null default 'blog',
  add column if not exists category_slug text,
  add column if not exists takeaways jsonb not null default '[]'::jsonb;

update public.posts
set content_type = 'blog'
where content_type is null or content_type = '';

notify pgrst, 'reload schema';
