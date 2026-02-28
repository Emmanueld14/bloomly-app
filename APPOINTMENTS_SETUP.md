# Charla (Appointments) Setup

Charla uses Supabase for booking/config data and supports payments with M-Pesa, Airtel Money, and PayPal.

## Recommended setup path

Use the migration-first setup in:

- `SUPABASE_SETUP.md`

Supabase migrations for Charla are:

- `supabase/migrations/202602280001_init_bloomly_supabase.sql`
- `supabase/migrations/202602280003_add_payment_attempts.sql`
- `supabase/migrations/202602280004_add_appointment_date_overrides.sql`

That migration creates:

- `appointment_settings`
- `appointment_blackouts`
- `appointment_bookings`
- `payment_attempts`
- `appointment_date_overrides`

## Minimum environment variables

Set these in your deployment platform (Cloudflare Pages / Vercel / Render / etc.):

- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`)
- `SUPABASE_ANON_KEY`
- `APPOINTMENTS_ADMIN_KEY`
- `SITE_URL`

For payment providers, also set:

- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `MPESA_CONSUMER_KEY`
- `MPESA_CONSUMER_SECRET`
- `MPESA_SHORTCODE`
- `MPESA_PASSKEY`
- `AIRTEL_CLIENT_ID`
- `AIRTEL_CLIENT_SECRET`

Optional but recommended:

- `MPESA_WEBHOOK_SECRET`
- `AIRTEL_WEBHOOK_SECRET`
- `MPESA_CALLBACK_URL`
- `AIRTEL_CALLBACK_URL`
- `PAYPAL_BASE_URL` (sandbox vs live)

> The appointments API routes use service-role credentials server-side, so Charla tables do not need public RLS policies.
