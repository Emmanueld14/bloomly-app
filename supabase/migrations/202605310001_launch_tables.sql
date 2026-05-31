-- Bloomly launch schema: CMS blog, Charla bookings, counsellor applications

alter table public.posts
  add column if not exists category text,
  add column if not exists content text,
  add column if not exists excerpt text,
  add column if not exists emoji text default '💜',
  add column if not exists published boolean not null default false,
  add column if not exists status text default 'draft';

update public.posts
set excerpt = coalesce(excerpt, summary),
    published = true,
    status = 'published'
where excerpt is null and summary is not null;

alter table public.subscribers
  add column if not exists name text;

alter table public.subscribers
  add column if not exists subscribed_at timestamptz;

update public.subscribers
set subscribed_at = created_at
where subscribed_at is null;

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text,
  phone text,
  plan text,
  amount integer,
  payment_method text,
  payment_status text not null default 'pending',
  booked_at timestamptz not null default now()
);

create index if not exists bookings_payment_status_idx on public.bookings (payment_status);
create index if not exists bookings_booked_at_idx on public.bookings (booked_at desc);

create table if not exists public.counsellor_applications (
  id uuid primary key default gen_random_uuid(),
  full_name text,
  email text,
  phone text,
  qualification text,
  institution text,
  years_experience integer,
  availability text,
  why_bloomly text,
  status text not null default 'pending',
  applied_at timestamptz not null default now()
);

create index if not exists counsellor_applications_status_idx on public.counsellor_applications (status);

alter table public.bookings enable row level security;
alter table public.counsellor_applications enable row level security;

drop policy if exists posts_read_public on public.posts;
create policy posts_read_published
on public.posts
for select
to anon, authenticated
using (published = true);

drop policy if exists subscribers_insert_public on public.subscribers;
create policy subscribers_insert_public
on public.subscribers
for insert
to anon, authenticated
with check (
  email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
);

create policy counsellor_applications_insert_public
on public.counsellor_applications
for insert
to anon, authenticated
with check (true);
