# Bloomly Admin — make stats & blog posts load

The admin panel needs **one** of these backends:

## Option A — Supabase Edge Functions (GitHub, recommended)

1. GitHub repo → **Settings → Secrets and variables → Actions → Repository secrets**
2. Add: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
3. **Actions → Supabase → Run workflow** (or push to `main`)
4. Wait until deploy + seed steps succeed

Functions deployed: `admin-stats`, `admin-posts`, `admin-bookings`, `admin-subscribers`, `admin-counsellor-applications`, `admin-sync-github-posts`, `admin-blog-image-upload`

## Option B — Cloudflare Pages env vars

If Supabase functions are not deployed yet, set on **Cloudflare → Pages → bloomly → Settings → Environment variables**:

| Variable | Value |
|----------|--------|
| `SUPABASE_URL` | `https://xmhyjttyarskimsxcfhl.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key from Supabase → API |

Redeploy the Pages project.

The admin UI tries Supabase admin Edge Functions first when configured, then Cloudflare `/api/admin/*` fallbacks. This avoids upload failures if the Pages API route is unavailable in production.

## Verify

Signed in at `/admin/`, open browser DevTools → Network:

- `GET /api/admin/stats` should return JSON (not HTML 404)
- Or `.../functions/v1/admin-stats` after Supabase deploy
- `POST .../functions/v1/admin-blog-image-upload` should return `{ url, path }` for blog image uploads

If you see **"Supabase is not configured"**, add Option A or B above.
