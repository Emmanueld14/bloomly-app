-- Admin content foundation: comment moderation, user deactivate, admin RLS.

-- Comments: moderation status for hide/show without hard-delete only workflows
alter table public.comments
  add column if not exists status text not null default 'visible';

alter table public.comments drop constraint if exists comments_status_check;
alter table public.comments
  add constraint comments_status_check
  check (status in ('visible', 'hidden'));

create index if not exists comments_status_timestamp_idx
  on public.comments (status, timestamp desc);

-- Profiles: soft-deactivate accounts
alter table public.profiles
  add column if not exists is_active boolean not null default true;

alter table public.profiles
  add column if not exists deactivated_at timestamptz;

create index if not exists profiles_is_active_idx on public.profiles (is_active);

-- =========================
-- Comments RLS (admin + public read of visible)
-- =========================
drop policy if exists comments_block_public on public.comments;
drop policy if exists comments_read_public on public.comments;
drop policy if exists comments_select_visible on public.comments;
drop policy if exists comments_select_admin on public.comments;
drop policy if exists comments_update_admin on public.comments;
drop policy if exists comments_delete_admin on public.comments;

create policy comments_select_visible
on public.comments for select
to anon, authenticated
using (status = 'visible');

create policy comments_select_admin
on public.comments for select
to authenticated
using (public.is_admin());

create policy comments_update_admin
on public.comments for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy comments_delete_admin
on public.comments for delete
to authenticated
using (public.is_admin());

-- Keep authenticated insert (from 20260804030000); recreate if missing
drop policy if exists comments_insert_authenticated on public.comments;
create policy comments_insert_authenticated
on public.comments for insert
to authenticated
with check (
  char_length(btrim(post_id)) > 0
  and char_length(btrim(text)) > 0
  and char_length(text) <= 4000
  and coalesce(status, 'visible') = 'visible'
);

-- =========================
-- Likes: allow read for dashboard; keep write authenticated
-- =========================
drop policy if exists likes_block_public on public.likes;
drop policy if exists likes_read_public on public.likes;
drop policy if exists likes_select_all on public.likes;

create policy likes_select_all
on public.likes for select
to anon, authenticated
using (true);

-- =========================
-- Email logs: admin read (table grant was revoked earlier)
-- =========================
grant select on table public.email_logs to authenticated;

drop policy if exists email_logs_block_public on public.email_logs;
drop policy if exists email_logs_select_admin on public.email_logs;

create policy email_logs_select_admin
on public.email_logs for select
to authenticated
using (public.is_admin());

-- =========================
-- Profiles: prevent self re-activation / self-toggles of admin-only fields
-- (profiles_admin_update already allows admin updates of is_active)
-- =========================
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles for update
to authenticated
using (id = auth.uid() and coalesce(is_active, true) = true)
with check (
  id = auth.uid()
  -- users cannot self-promote to admin
  and role = (select p.role from public.profiles p where p.id = auth.uid())
  -- users cannot change their own active/deactivated flags
  and is_active = (select p.is_active from public.profiles p where p.id = auth.uid())
  and deactivated_at is not distinct from (
    select p.deactivated_at from public.profiles p where p.id = auth.uid()
  )
);

notify pgrst, 'reload schema';
