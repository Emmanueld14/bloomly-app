-- Security hardening migration to address Supabase Security Advisor findings:
-- - RLS disabled on public tables
-- - RLS policies that are effectively always true
-- - RLS enabled with no policies
-- - mutable function search_path

alter function public.set_updated_at()
  set search_path = public, pg_temp;

do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'set_email_queue_updated_at'
      and p.pronargs = 0
  ) then
    execute 'alter function public.set_email_queue_updated_at() set search_path = public, pg_temp';
  end if;
end
$$;

do $$
declare
  table_name text;
  policy_name text;
begin
  foreach table_name in array array[
    'appointment_settings',
    'appointment_blackouts',
    'appointment_bookings',
    'appointment_date_overrides',
    'likes',
    'comments',
    'subscribers',
    'payment_attempts',
    'email_logs',
    'email_queue'
  ]
  loop
    if to_regclass('public.' || table_name) is not null then
      execute format('alter table public.%I enable row level security', table_name);

      for policy_name in
        select p.policyname
        from pg_policies p
        where p.schemaname = 'public'
          and p.tablename = table_name
      loop
        execute format('drop policy if exists %I on public.%I', policy_name, table_name);
      end loop;
    end if;
  end loop;
end
$$;

create policy appointment_settings_read_public
on public.appointment_settings
for select
to anon, authenticated
using (id = 1);

create policy appointment_blackouts_read_public
on public.appointment_blackouts
for select
to anon, authenticated
using (date >= date '2000-01-01');

create policy appointment_date_overrides_read_public
on public.appointment_date_overrides
for select
to anon, authenticated
using (date >= date '2000-01-01');

create policy appointment_bookings_block_public
on public.appointment_bookings
for all
to anon, authenticated
using (false)
with check (false);

create policy likes_block_public
on public.likes
for all
to anon, authenticated
using (false)
with check (false);

create policy comments_block_public
on public.comments
for all
to anon, authenticated
using (false)
with check (false);

create policy subscribers_insert_public
on public.subscribers
for insert
to anon, authenticated
with check (
  email ~* '^[^[:space:]@]+@[^[:space:]@]+\\.[^[:space:]@]+$'
);

create policy subscribers_block_public_read
on public.subscribers
for select
to anon, authenticated
using (false);

create policy payment_attempts_block_public
on public.payment_attempts
for all
to anon, authenticated
using (false)
with check (false);

create policy email_logs_block_public
on public.email_logs
for all
to anon, authenticated
using (false)
with check (false);

do $$
begin
  if to_regclass('public.email_queue') is not null then
    execute $policy$
      create policy email_queue_block_public
      on public.email_queue
      for all
      to anon, authenticated
      using (false)
      with check (false)
    $policy$;
  end if;
end
$$;
