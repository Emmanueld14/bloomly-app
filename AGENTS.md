# AGENTS.md

Guidance for coding agents working in this repository.

## 1) Project snapshot

- Product: Bloomly (teen mental health content platform).
- Frontend: static HTML/CSS/vanilla JS (no framework build pipeline).
- Content: markdown posts under `content/blog/`.
- Integrations:
  - GitHub OAuth for admin blog editing.
  - Supabase (newsletter + appointments data).
  - Stripe Checkout (appointments booking flow).
  - Optional Render-based OAuth proxy service.

## 2) High-value directories

- `index.html`, `about.html`, `blog.html`, `blog-post.html`, `styles.css`, `script.js`
- `src/data/` - blog data loading/parsing logic
- `src/appointments/` - appointments booking client flow
- `src/admin/` - shared admin blog logic
- `admin/` - admin UI and config
- `api/` - Vercel serverless endpoints (Node-style `export default handler(req, res)`)
- `functions/` - Cloudflare Pages Functions equivalents (`onRequest...`)
- `supabase/functions/` - Supabase Edge Functions (Deno)
- `render-api/` - Express service for OAuth token exchange (Render deployment)

## 3) Local development

- Install root dependencies: `npm install`
- Run static site locally: `npm run dev` (serves on port 3000)
- Build command is a no-op check: `npm run build`

Optional OAuth proxy local run:

- `cd render-api`
- `npm install`
- `npm start`

## 4) Platform-specific API duplication (important)

This repo intentionally keeps parallel implementations for different hosts.
When changing shared behavior, update both sides so logic and response shapes stay aligned.

- Vercel: `api/appointments-*.js`, `api/appointments-helpers.js`, `api/github-auth.js`
- Cloudflare Pages: `functions/api/appointments-*.js`, `functions/appointments-helpers.js`, `functions/github-auth.js`

Do not assume these files are identical in structure; keep runtime-specific wrappers but mirror business logic changes.

## 5) Blog content rules

- Blog posts live in `content/blog/*.md`.
- Keep frontmatter at top with `---` delimiters; `title` is required.
- File name (slug) should match route slug.
- Local index fallback is read from `content/blog/index.json`; keep it consistent when adding/removing local posts.
- Some loaders merge with `content/blog/legacy.json`; avoid deleting legacy references unless intentionally migrating behavior.

## 6) Environment and secrets

Never commit new secrets or real credentials.
Use environment variables/placeholders for all sensitive values.

Common variables used across features:

- GitHub OAuth: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
- Supabase: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`
- Newsletter email: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
- Admin guards: `ADMIN_PUBLISH_KEY`, `APPOINTMENTS_ADMIN_KEY`
- Payments: `STRIPE_SECRET_KEY`

## 7) Validation checklist for agent changes

At minimum before finishing:

1. Run `npm run build`.
2. For frontend changes, manually load impacted pages locally.
3. For API/function changes, verify method handling and CORS behavior remain intact.
4. If editing duplicated platform endpoints, confirm both implementations were updated.
5. If editing blog loaders/parsers, test at least one listing page and one post page.

## 8) Documentation and drift notes

- Some docs in this repository are historical snapshots and may not match current code exactly.
- Prefer current source code behavior over older setup guides when conflicts appear.
- CI currently references scripts (`lint`, `test`, `migrate`) that are not defined in root `package.json`; do not rely on those unless you add/restore them intentionally.

## 9) Change discipline

- Keep changes scoped and minimal.
- Preserve existing routing behavior in `_redirects` and `vercel.json` unless the task explicitly changes routing.
- Avoid introducing new frameworks/build tooling unless explicitly requested.
