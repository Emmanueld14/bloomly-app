-- Public blog readers should only see posts that are actually published.
-- Admin Edge/Pages functions use the service role key and bypass RLS for writes.

drop policy if exists posts_read_public on public.posts;

create policy posts_read_public
on public.posts
for select
to anon, authenticated
using (
  published is true
  and coalesce(status, 'draft') = 'published'
);

notify pgrst, 'reload schema';
