-- Username + avatar for member profiles.
-- Run this in the Supabase SQL editor (agent does not apply it).

alter table public.profiles
  add column if not exists username text,
  add column if not exists avatar_url text;

-- Unique usernames (case-insensitive)
create unique index if not exists profiles_username_lower_idx
  on public.profiles (lower(username))
  where username is not null;

alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles
  add constraint profiles_username_format
  check (
    username is null
    or username ~ '^[a-zA-Z0-9_]{3,24}$'
  );

-- Default usernames for new signups: user_XXXXXXXX (first 8 hex of uuid)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  default_username text;
begin
  default_username := 'user_' || substr(replace(new.id::text, '-', ''), 1, 8);

  insert into public.profiles (id, email, display_name, username, role)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'display_name',
      new.raw_user_meta_data->>'user_name',
      split_part(new.email, '@', 1),
      default_username
    ),
    default_username,
    'user'
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(public.profiles.display_name, excluded.display_name),
        username = coalesce(public.profiles.username, excluded.username);
  return new;
end;
$$;

-- Backfill default usernames so incomplete-setup detection works
update public.profiles
set username = 'user_' || substr(replace(id::text, '-', ''), 1, 8)
where username is null or btrim(username) = '';

-- Public-safe identity view (no email) for comments / nav avatars
create or replace view public.public_profiles
with (security_invoker = false)
as
select
  id,
  username,
  avatar_url,
  display_name
from public.profiles;

grant select on public.public_profiles to anon, authenticated;

-- Authenticated users can read peer profiles (needed for joins); email stays on the row
-- but clients should only select identity fields for others.
drop policy if exists profiles_select_own_or_admin on public.profiles;
drop policy if exists profiles_select_authenticated on public.profiles;
create policy profiles_select_authenticated
on public.profiles for select
to authenticated
using (true);

drop policy if exists profiles_select_own_anon on public.profiles;
-- anon does not read the base table; use public_profiles view instead

-- Avatars storage bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists avatars_public_read on storage.objects;
create policy avatars_public_read
on storage.objects for select
to anon, authenticated
using (bucket_id = 'avatars');

drop policy if exists avatars_insert_own on storage.objects;
create policy avatars_insert_own
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists avatars_update_own on storage.objects;
create policy avatars_update_own
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists avatars_delete_own on storage.objects;
create policy avatars_delete_own
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

notify pgrst, 'reload schema';
