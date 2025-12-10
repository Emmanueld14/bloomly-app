# 🔧 FIXED: GitHub OAuth Setup for Netlify CMS

## ⚠️ Important: Updated Setup Process

The previous instructions were incomplete. Here's the **correct** way to set up GitHub OAuth with Netlify CMS:

## Step 1: Update GitHub OAuth App Callback URL

1. Go to: https://github.com/settings/developers
2. Click on your **"Bloomly CMS"** OAuth app
3. **Change the Authorization callback URL** to:
   ```
   https://api.netlify.com/auth/done
   ```
4. Click **"Update application"**

## Step 2: Configure OAuth in Netlify (NOT Environment Variables!)

1. Go to: https://app.netlify.com
2. Select your site (bloomlyhub)
3. Go to **Site settings** → **Access control** → **OAuth**
4. Under **"Authentication Providers"**, click **"Install Provider"**
5. Select **"GitHub"**
6. Enter:
   - **Client ID**: `Ov23lisq0cWIwOcVfe5r` (your Client ID)
   - **Client Secret**: (paste your Client Secret)
7. Click **"Install"** or **"Save"**

## Step 3: Verify CMS Config

The config files are already correct:
- ✅ `public/admin/config.yml` - Uses GitHub backend
- ✅ `static/admin/config.yml` - Uses GitHub backend
- ✅ Repository: `Emmanueld14/bloomly-app`
- ✅ Branch: `main`

## Step 4: Test the CMS

1. Go to: `https://bloomly.co.ke/admin`
2. You should see **"Login with GitHub"** button
3. Click it and authorize
4. You'll be redirected back to the CMS

## What Was Wrong?

❌ **Before**: We tried to use environment variables (`GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`)  
✅ **Now**: We use Netlify's OAuth provider system (more secure and proper way)

❌ **Before**: Callback URL was `https://bloomly.co.ke/admin`  
✅ **Now**: Callback URL is `https://api.netlify.com/auth/done` (Netlify's OAuth endpoint)

## Troubleshooting

### Still not working?

1. **Clear browser cache** - Try incognito/private window
2. **Check Netlify OAuth settings** - Make sure GitHub provider is installed
3. **Verify callback URL** - Must be `https://api.netlify.com/auth/done`
4. **Check repository access** - Make sure your GitHub account has access to `Emmanueld14/bloomly-app`
5. **Redeploy site** - After making changes, trigger a new deploy

### Error: "Authorization failed"

- Verify the Client ID and Secret in Netlify OAuth settings
- Make sure callback URL in GitHub app is `https://api.netlify.com/auth/done`
- Check that the OAuth app is authorized in your GitHub account

### Error: "Repository not found"

- Verify the repo name is correct: `Emmanueld14/bloomly-app`
- Make sure you have access to the repository
- Check that the branch is `main` (not `master`)

## Quick Checklist

- [ ] GitHub OAuth app created
- [ ] Callback URL set to `https://api.netlify.com/auth/done`
- [ ] OAuth provider installed in Netlify (Site settings → Access control → OAuth)
- [ ] Client ID and Secret added to Netlify OAuth provider
- [ ] CMS config files updated (already done)
- [ ] Site redeployed (if needed)
- [ ] Tested at `https://bloomly.co.ke/admin`

---

**The key difference**: Use Netlify's OAuth provider system, not environment variables!

