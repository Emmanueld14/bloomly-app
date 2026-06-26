-- Reduce pg_graphql exposure for private/operational tables.
--
-- Supabase GraphQL exposes objects to anon/authenticated when those roles have
-- table-level SELECT. These tables are accessed through service-role Edge or
-- Pages functions, or accept public INSERT only, so public SELECT is not needed.
--
-- Keep public SELECT on posts, likes, and comments because the current blog UI
-- reads those directly with the publishable anon key.

revoke select on table
  public.appointment_blackouts,
  public.appointment_bookings,
  public.appointment_date_overrides,
  public.appointment_settings,
  public.email_logs,
  public.payment_attempts,
  public.subscribers
from anon, authenticated;

do $$
begin
  if to_regclass('public.email_queue') is not null then
    revoke select on table public.email_queue from anon, authenticated;
  end if;
end
$$;

notify pgrst, 'reload schema';
