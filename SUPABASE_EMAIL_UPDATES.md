## Supabase email updates for new blog posts

This project can email existing subscribers whenever a new post is published.

## 1) Database schema

Use the migration in:

- `supabase/migrations/202602280001_init_bloomly_supabase.sql`

It creates all required tables for this flow:

- `subscribers`
- `posts`
- `email_logs`

You can apply it with:

```bash
supabase db push
```

## 2) Edge Function secrets

Set these in Supabase -> Edge Functions -> Secrets:

```bash
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
RESEND_API_KEY=YOUR_RESEND_API_KEY
RESEND_FROM_EMAIL=Your Name <noreply@yourdomain.com>
ADMIN_PUBLISH_KEY=YOUR_ADMIN_PUBLISH_KEY
```

`ADMIN_PUBLISH_KEY` protects `notify-subscribers` and `publish-post` via the
`X-Admin-Key` header from the admin panel.

## 3) Deploy functions

```bash
supabase functions deploy subscribe-newsletter
supabase functions deploy publish-post
supabase functions deploy notify-subscribers
```

If this repo is not linked yet:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

## 4) Test

1. Add at least one subscriber (newsletter form).
2. In `/admin`, publish a post.
3. Confirm rows in:
   - `posts` (upserted post metadata)
   - `email_logs` (send success/failure per recipient)

## 5) Optional DB webhook

To auto-notify when a row is inserted into `posts`, configure a Supabase
Database Webhook:

- Table: `posts`
- Event: `INSERT`
- URL: `https://YOUR_PROJECT.supabase.co/functions/v1/notify-subscribers`
- Header: `X-Admin-Key: YOUR_ADMIN_PUBLISH_KEY`

