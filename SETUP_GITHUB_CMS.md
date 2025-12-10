# Setup Guide: GitHub Backend for Netlify CMS

## ✅ Good News!

Since Netlify Identity is deprecated, we've switched your CMS to use **GitHub OAuth** instead. This is actually simpler and more secure!

## How It Works

- Users authenticate directly with GitHub (no separate Identity service needed)
- Changes are committed directly to your GitHub repository
- You control access through GitHub repository permissions

## Setup Steps

### Step 1: Create a GitHub OAuth App

1. Go to GitHub: https://github.com/settings/developers
2. Click **"New OAuth App"** (or **"OAuth Apps"** → **"New OAuth App"**)
3. Fill in the form:
   - **Application name**: `Bloomly CMS`
   - **Homepage URL**: `https://bloomly.co.ke` (or your Netlify URL)
   - **Authorization callback URL**: `https://api.netlify.com/auth/done` ⚠️ **IMPORTANT: Use this exact URL**
4. Click **"Register application"**
5. **Copy the Client ID** (you'll need this)
6. Click **"Generate a new client secret"**
7. **Copy the Client Secret** (you'll only see it once!)

### Step 2: Configure OAuth Provider in Netlify (NOT Environment Variables!)

1. Go to your Netlify dashboard: https://app.netlify.com
2. Select your site (bloomlyhub)
3. Go to **Site settings** → **Access control** → **OAuth**
4. Under **"Authentication Providers"**, click **"Install Provider"**
5. Select **"GitHub"**
6. Enter:
   - **Client ID**: (paste your Client ID from Step 1)
   - **Client Secret**: (paste your Client Secret from Step 1)
7. Click **"Install"** or **"Save"**

### Step 3: Update CMS Config (Already Done!)

The CMS config has been updated to use GitHub backend. The files are already configured:
- `public/admin/config.yml` - Uses GitHub backend
- `static/admin/config.yml` - Uses GitHub backend

### Step 4: Access the CMS

1. Go to: `https://bloomly.co.ke/admin` (or your Netlify URL)
2. You'll see a **"Login with GitHub"** button
3. Click it and authorize the app
4. You'll be redirected back to the CMS interface

## What Changed

✅ **Removed**: Netlify Identity widget (no longer needed)  
✅ **Added**: GitHub OAuth authentication  
✅ **Updated**: CMS config to use GitHub backend  
✅ **Simplified**: No need to enable Identity or Git Gateway  

## Security Notes

- Only users with access to your GitHub repository can use the CMS
- You control access through GitHub repository settings
- All changes are committed directly to your repo
- You can see who made changes in the commit history

## Troubleshooting

### "Login with GitHub" button doesn't appear
- Make sure you've added the environment variables in Netlify
- Check that the callback URL matches your site URL
- Try clearing browser cache

### "Authorization failed"
- Verify the Client ID and Secret are correct in Netlify environment variables
- Check that the callback URL in GitHub OAuth app matches your site URL
- Make sure the GitHub app is authorized

### Can't save changes
- Verify you have write access to the GitHub repository
- Check that the branch is set to `main` in config.yml
- Ensure your GitHub account has permission to commit

## Need Help?

- [Netlify CMS GitHub Backend Docs](https://www.netlifycms.org/docs/github-backend/)
- [GitHub OAuth Apps Documentation](https://docs.github.com/en/apps/oauth-apps)

---

**Note**: This setup is more secure and doesn't rely on deprecated services. Your CMS will work reliably going forward!

