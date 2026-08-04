-- User profiles with admin/user roles for the Next.js blog app.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  role text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists profiles_email_idx on public.profiles (email);

create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_profiles_updated_at();

-- Auto-create a profile when a user signs up (default role: user)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    'user'
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(public.profiles.display_name, excluded.display_name);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- Backfill profiles for existing auth users
insert into public.profiles (id, email, display_name, role)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1)),
  'user'
from auth.users u
on conflict (id) do nothing;

-- Helper: is the current user an admin?
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

grant execute on function public.is_admin() to anon, authenticated;

alter table public.profiles enable row level security;

drop policy if exists profiles_select_own_or_admin on public.profiles;
create policy profiles_select_own_or_admin
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
on public.profiles for insert
to authenticated
with check (id = auth.uid() and role = 'user');

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (
  id = auth.uid()
  -- users cannot self-promote to admin
  and role = (select p.role from public.profiles p where p.id = auth.uid())
);

drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update
on public.profiles for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Tighten post/category/tag write policies to admins only
drop policy if exists categories_admin_insert on public.categories;
drop policy if exists categories_admin_update on public.categories;
drop policy if exists categories_admin_delete on public.categories;
create policy categories_admin_insert on public.categories for insert to authenticated with check (public.is_admin());
create policy categories_admin_update on public.categories for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy categories_admin_delete on public.categories for delete to authenticated using (public.is_admin());

drop policy if exists tags_admin_insert on public.tags;
drop policy if exists tags_admin_update on public.tags;
drop policy if exists tags_admin_delete on public.tags;
create policy tags_admin_insert on public.tags for insert to authenticated with check (public.is_admin());
create policy tags_admin_update on public.tags for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy tags_admin_delete on public.tags for delete to authenticated using (public.is_admin());

drop policy if exists post_tags_admin_insert on public.post_tags;
drop policy if exists post_tags_admin_update on public.post_tags;
drop policy if exists post_tags_admin_delete on public.post_tags;
create policy post_tags_admin_insert on public.post_tags for insert to authenticated with check (public.is_admin());
create policy post_tags_admin_update on public.post_tags for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy post_tags_admin_delete on public.post_tags for delete to authenticated using (public.is_admin());

drop policy if exists posts_authenticated_insert on public.posts;
drop policy if exists posts_authenticated_update on public.posts;
drop policy if exists posts_authenticated_delete on public.posts;
create policy posts_admin_insert on public.posts for insert to authenticated with check (public.is_admin());
create policy posts_admin_update on public.posts for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy posts_admin_delete on public.posts for delete to authenticated using (public.is_admin());

-- Storage writes: admins only
drop policy if exists blog_images_authenticated_insert on storage.objects;
drop policy if exists blog_images_authenticated_update on storage.objects;
drop policy if exists blog_images_authenticated_delete on storage.objects;
create policy blog_images_admin_insert on storage.objects for insert to authenticated
with check (bucket_id = 'blog-images' and public.is_admin());
create policy blog_images_admin_update on storage.objects for update to authenticated
using (bucket_id = 'blog-images' and public.is_admin())
with check (bucket_id = 'blog-images' and public.is_admin());
create policy blog_images_admin_delete on storage.objects for delete to authenticated
using (bucket_id = 'blog-images' and public.is_admin());

notify pgrst, 'reload schema';
