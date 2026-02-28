# Charla (Appointments) Setup

Charla uses Supabase for booking/config data and Stripe Checkout for payments.

## Recommended setup path

Use the migration-first setup in:

- `SUPABASE_SETUP.md`

The Supabase migration that creates Charla tables is:

- `supabase/migrations/202602280001_init_bloomly_supabase.sql`

That migration creates:

- `appointment_settings`
- `appointment_blackouts`
- `appointment_bookings`

## Minimum environment variables

Set these in your deployment platform (Cloudflare Pages / Vercel / Render / etc.):

- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`)
- `SUPABASE_ANON_KEY`
- `APPOINTMENTS_ADMIN_KEY`
- `STRIPE_SECRET_KEY`

> The appointments API routes use service-role credentials server-side, so Charla tables do not need public RLS policies.
