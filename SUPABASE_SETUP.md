# Supabase Setup (Charla + Blog + Newsletter)

This repo now includes a migration-driven Supabase setup for:

- **Charla bookings** (`appointment_settings`, `appointment_blackouts`, `appointment_bookings`)
- **Blog interactions** (`likes`, `comments`)
- **Newsletter + post notifications** (`subscribers`, `posts`, `email_logs`)

---

## 1) Link your Supabase project

From repo root:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

Then update:

- `supabase/config.toml` -> set `project_id = "YOUR_PROJECT_REF"`

---

## 2) Apply database schema

Migration files:

- `supabase/migrations/202602280001_init_bloomly_supabase.sql`
- `supabase/migrations/202602280002_harden_existing_tables.sql`
- `supabase/migrations/202602280003_add_payment_attempts.sql`
- `supabase/migrations/202602280004_add_appointment_date_overrides.sql`

Apply it with either:

```bash
supabase db push
```

or run SQL manually in Supabase SQL Editor.

---

## 3) Configure environment variables

Use `.env.example` as reference.

### Required for Charla APIs (`/api/appointments-*` or `functions/api/appointments-*`)

- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`)
- `APPOINTMENTS_ADMIN_KEY`
- `SITE_URL`
- `STRIPE_SECRET_KEY` (optional if using Stripe flow)

### Required for multi-method Charla payments

- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `PAYPAL_BASE_URL` (`https://api-m.sandbox.paypal.com` for sandbox)
- `MPESA_CONSUMER_KEY`
- `MPESA_CONSUMER_SECRET`
- `MPESA_SHORTCODE`
- `MPESA_PASSKEY`
- `MPESA_CALLBACK_URL` (or `MPESA_WEBHOOK_SECRET` and default callback)
- `AIRTEL_CLIENT_ID`
- `AIRTEL_CLIENT_SECRET`
- `AIRTEL_CALLBACK_URL` (or `AIRTEL_WEBHOOK_SECRET` and default callback)

### Required for frontend Supabase client features

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

### Required for Supabase Edge Functions (`supabase/functions/*`)

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_PUBLISH_KEY`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

---

## 4) Deploy Edge Functions

```bash
supabase functions deploy subscribe-newsletter
supabase functions deploy publish-post
supabase functions deploy notify-subscribers
supabase functions deploy appointments-settings
supabase functions deploy appointments-availability
supabase functions deploy appointments-book
supabase functions deploy payments-status
supabase functions deploy payments-initiate
supabase functions deploy payments-paypal-capture
supabase functions deploy appointments-webhook-mpesa
supabase functions deploy appointments-webhook-airtel
```

`supabase/config.toml` is configured with `verify_jwt = false` for these functions because they use either:

- public newsletter submissions, or
- custom `X-Admin-Key` protection.

---

## 5) Quick verification checklist

### Charla

1. Open `/admin` -> Charla section.
2. Save settings (requires `APPOINTMENTS_ADMIN_KEY`).
3. Open `/appointments` and verify date/slot availability loads.
4. Start a booking and verify row appears in `appointment_bookings`.

### Newsletter

1. Submit email in a newsletter form.
2. Verify it appears in `subscribers`.

### Blog notifications

1. Publish a post from `/admin`.
2. Verify `posts` row exists.
3. Verify `email_logs` receives send results.

### Likes and comments

1. Open a blog post page.
2. Click Like and submit a comment.
3. Verify rows in `likes` and `comments`.

---

## Notes

- `likes` is added to `supabase_realtime` publication in the migration to support live like count updates.
- Appointments APIs use service-role credentials server-side, so public RLS policies are not required for Charla tables.
