# AetherPress — Next.js + Supabase Blog

Full-stack editorial blog with public essays and a clean admin CMS.

## Stack

- Next.js App Router + TypeScript + Tailwind CSS
- Supabase Auth, Postgres, and Storage

## Setup

1. Copy env vars:

```bash
cp .env.example .env.local
```

2. Fill in:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. Apply the SQL migration from the repo root:

```text
supabase/migrations/20260804010000_nextjs_blog_schema.sql
```

Run it in the Supabase SQL editor (or via Supabase CLI). It creates `categories`, `tags`, `post_tags`, adds CMS columns on `posts`, RLS policies, and storage policies for `blog-images`.

4. Install & run:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Routes

| Path | Description |
|------|-------------|
| `/` | Paginated published posts |
| `/posts/[slug]` | Single essay (markdown) |
| `/category/[slug]`, `/tag/[slug]` | Filters |
| `/login`, `/signup` | Supabase email/password auth |
| `/admin` | Dashboard stats + New Post |
| `/admin/posts` | Table with search/filter/actions |
| `/admin/posts/new`, `/admin/posts/[id]/edit` | Markdown editor + autosave |
| `/admin/media` | Storage image grid + copy URL |
| `/admin/categories` | Category & tag CRUD |
| `/api/health` | Keep-alive ping for free-tier pause |

## Auth & roles

- Public nav has **Log in** / **Sign up** for everyone.
- New accounts get role `user` in `public.profiles`.
- `/account` is for all signed-in users.
- `/admin/*` requires role `admin` (client auth gate + RLS).

### Deployed on bloomly.co.ke

The root `npm run build` static-exports this app and publishes it into the
Cloudflare Pages site so **`https://bloomly.co.ke/admin`** is AetherPress
(not the legacy GitHub admin).

### Make the first admin

After signing up once, run this in the Supabase SQL editor (replace the email):

```sql
update public.profiles
set role = 'admin'
where email = 'you@example.com';
```

Then open `/admin/users` to promote or demote others.

## Keep Supabase awake

Hit `/api/health` on a schedule (cron / uptime monitor) so free-tier projects are less likely to stay paused.
