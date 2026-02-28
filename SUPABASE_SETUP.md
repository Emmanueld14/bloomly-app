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

The migration file is:

- `supabase/migrations/202602280001_init_bloomly_supabase.sql`

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
- `STRIPE_SECRET_KEY`

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
