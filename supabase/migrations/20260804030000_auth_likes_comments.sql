-- Per-user likes + require authentication to like/comment.

create table if not exists public.user_post_likes (
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create index if not exists user_post_likes_post_id_idx
  on public.user_post_likes (post_id);

alter table public.user_post_likes enable row level security;

drop policy if exists user_post_likes_read on public.user_post_likes;
create policy user_post_likes_read
on public.user_post_likes for select
to anon, authenticated
using (true);

drop policy if exists user_post_likes_insert_own on public.user_post_likes;
create policy user_post_likes_insert_own
on public.user_post_likes for insert
to authenticated
with check (user_id = auth.uid() and char_length(btrim(post_id)) > 0);

drop policy if exists user_post_likes_delete_own on public.user_post_likes;
create policy user_post_likes_delete_own
on public.user_post_likes for delete
to authenticated
using (user_id = auth.uid());

-- Keep public like counts readable; only authenticated users can change counts.
drop policy if exists likes_insert_public on public.likes;
drop policy if exists likes_update_public on public.likes;
drop policy if exists likes_insert_authenticated on public.likes;
drop policy if exists likes_update_authenticated on public.likes;

create policy likes_insert_authenticated
on public.likes for insert
to authenticated
with check (char_length(btrim(post_id)) > 0 and count >= 0);

create policy likes_update_authenticated
on public.likes for update
to authenticated
using (true)
with check (char_length(btrim(post_id)) > 0 and count >= 0);

-- Comments: anyone can read; only signed-in users can post.
drop policy if exists comments_insert_public on public.comments;
drop policy if exists comments_insert_authenticated on public.comments;

create policy comments_insert_authenticated
on public.comments for insert
to authenticated
with check (
  char_length(btrim(post_id)) > 0
  and char_length(btrim(text)) > 0
  and char_length(text) <= 4000
);

alter table public.comments
  add column if not exists user_id uuid references auth.users(id) on delete set null;

notify pgrst, 'reload schema';
