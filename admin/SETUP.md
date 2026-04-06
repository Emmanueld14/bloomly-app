# Admin Panel Setup Guide

The classic admin at `/admin/` uses GitHub OAuth for repository access, then a **site admin password** (stored only in the browser session) for Supabase-backed actions (email to subscribers, Charla settings, publish-post sync).

## Step 1: Create GitHub OAuth App

1. Go to GitHub → Settings → Developer settings → OAuth Apps  
   https://github.com/settings/developers

2. Click **New OAuth App**

3. Fill in:
   - **Application name**: `Bloomly Admin` (or any name)
   - **Homepage URL**: your site (e.g. `https://bloomly.co.ke`)
   - **Authorization callback URL**: `https://yourdomain.com/admin/callback.html`

4. Register the app and copy the **Client ID**.

5. Generate a **Client Secret** — this value must **only** be configured on the server that exchanges the OAuth `code` for an access token (see `api/github-auth.js`, `render-api/`, or Cloudflare `functions/github-auth.js`). Do **not** put the client secret in `admin/config.js`.

## Step 2: Configure `admin/config.js`

Set only the **public** client ID and repo details:

- `clientId` — your GitHub OAuth App Client ID
- `repoOwner`, `repoName`, `repoBranch`
- `vercelApiUrl` or your deployed `POST /api/github-auth` URL (e.g. Render)

## Step 3: Token exchange host (OAuth callback)

Your callback (`admin/callback.html`) sends `code` and `redirect_uri` to the backend. The backend must have:

- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`

See [SUPABASE_SETUP.md](../SUPABASE_SETUP.md) and the repo’s `api/github-auth.js` for Vercel-style deployment.

## Step 4: Site admin password (Supabase)

In the Supabase project (Edge Function secrets), set **`ADMIN_PUBLISH_KEY` and `APPOINTMENTS_ADMIN_KEY` to the same strong secret**. After you sign in with GitHub on `/admin/`, enter that value once on the **Unlock** screen. It is kept in `sessionStorage` until you click **Lock admin** or log out.

No admin password should be committed in the repo.

## Access

1. Open `/admin/`
2. **Login with GitHub**
3. **Unlock** with the admin password
4. Use the sidebar: **Blog posts**, **Email subscribers**, **Charla**

## Troubleshooting

- **OAuth fails after deploy** — Ensure the callback URL matches the OAuth app exactly and the token host has `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` set.
- **Charla/email APIs return 401** — Unlock admin again; confirm both Supabase keys match what you entered.
- **Posts fail to load** — Confirm GitHub token has `repo` scope and `repoOwner` / `repoName` in `config.js` are correct.
