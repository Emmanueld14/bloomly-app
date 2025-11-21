# Netlify Deployment Guide for Bloomly

This guide will walk you through deploying Bloomly to Netlify with Supabase integration and connecting your custom domain.

## Prerequisites

- GitHub account
- Netlify account (free tier works)
- Domain name (optional, for custom domain)
- Node.js installed locally (for testing the build script)

## Step 1: Prepare Project for Deployment ✅

All configuration files have been prepared:

- ✅ `netlify.toml` - Updated with correct build configuration
- ✅ `scripts/generate-config.js` - Created to generate supabase-config.js during build
- ✅ `.gitignore` - Already includes supabase-config.js
- ✅ Admin role removed from signup (only user accounts allowed)

## Step 2: Push Project to GitHub

### 2.1 Initialize Git (if not already done)

Open terminal in your project directory and run:

```bash
# Check if git is already initialized
git status

# If not initialized, run:
git init
git add .
git commit -m "Initial commit - Ready for Netlify deployment"
```

### 2.2 Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `bloomly-app` (or your preferred name)
3. Description: "Bloomly - Mental Wellness Platform"
4. **DO NOT** initialize with README, .gitignore, or license
5. Click "Create repository"

### 2.3 Push Code to GitHub

```bash
# Add remote repository (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/bloomly-app.git

# Rename branch to main (if needed)
git branch -M main

# Push code to GitHub
git push -u origin main
```

**Note:** You may need to authenticate. Use a Personal Access Token if prompted.

## Step 3: Deploy to Netlify

### 3.1 Sign Up / Log In to Netlify

1. Go to https://app.netlify.com
2. Click "Sign up" or "Log in"
3. **Recommended:** Sign up with GitHub (makes deployment easier)

### 3.2 Create New Site from GitHub

1. Click **"Add new site"** → **"Import an existing project"**
2. Click **"Deploy with GitHub"**
3. Authorize Netlify to access your GitHub account
4. Select your repository: `bloomly-app` (or your repository name)

### 3.3 Configure Build Settings

Netlify should auto-detect settings from `netlify.toml`, but verify:

- **Build command:** `node scripts/generate-config.js`
- **Publish directory:** `.` (current directory)
- **Branch to deploy:** `main`

Click **"Deploy site"**

### 3.4 Wait for Initial Deployment

- First deployment may take 1-2 minutes
- You'll see build logs in real-time
- If build fails, check the logs for errors

## Step 4: Configure Environment Variables

### 4.1 Add Environment Variables in Netlify

1. Go to **Site settings** → **Environment variables**
2. Click **"Add a variable"**
3. Add the following variables:

   **Variable 1:**
   - Key: `SUPABASE_URL`
   - Value: `https://qifalarexcszkhwxzeir.supabase.co`
   - Scope: All scopes

   **Variable 2:**
   - Key: `SUPABASE_ANON_KEY`
   - Value: `sb_publishable_oQuKmrT-0qwhGKsW0HdtzA__CnLadnL`
   - Scope: All scopes

4. Click **"Save"** for each variable

### 4.2 Trigger New Deployment

After adding environment variables:

1. Go to **Deploys** tab
2. Click **"Trigger deploy"** → **"Deploy site"**
3. This will rebuild with the environment variables

### 4.3 Verify Build Success

1. Check build logs to ensure `supabase-config.js` was generated
2. Look for: `✅ Generated supabase-config.js`
3. Verify both environment variables show as "Set"

## Step 5: Connect Custom Domain (Optional)

### 5.1 Add Domain in Netlify

1. Go to **Site settings** → **Domain management**
2. Click **"Add custom domain"**
3. Enter your domain (e.g., `bloomly.com` or `www.bloomly.com`)
4. Click **"Verify"**

### 5.2 Configure DNS Records

Netlify will show you the DNS records to add. Choose one:

**Option A: Root Domain (bloomly.com)**

Add an **A record** in your domain registrar:
- Type: `A`
- Name: `@` or leave blank
- Value: Netlify's IP address (shown in Netlify dashboard)
- TTL: 3600 (or default)

**Option B: Subdomain (www.bloomly.com)**

Add a **CNAME record**:
- Type: `CNAME`
- Name: `www`
- Value: Your Netlify site URL (e.g., `bloomly-app.netlify.app`)
- TTL: 3600 (or default)

### 5.3 Wait for DNS Propagation

- DNS changes can take 5 minutes to 48 hours
- Check propagation: https://www.whatsmydns.net/
- Netlify will automatically provision SSL certificate once DNS is verified

### 5.4 Verify SSL Certificate

1. Once DNS is verified, Netlify automatically provisions Let's Encrypt SSL
2. Wait 5-10 minutes for SSL to be issued
3. Your site will be available at `https://yourdomain.com`

## Step 6: Verify Deployment

### 6.1 Test Netlify URL

1. Visit your Netlify site: `https://bloomly-app.netlify.app` (or your site name)
2. Test the following:
   - ✅ Homepage loads
   - ✅ Sign up works
   - ✅ Login works
   - ✅ Chat with Deborah works
   - ✅ Journal entries save
   - ✅ Mood tracking works
   - ✅ All features function correctly

### 6.2 Test Custom Domain (if configured)

1. Visit your custom domain: `https://yourdomain.com`
2. Verify HTTPS is working (green lock icon)
3. Test all features again

### 6.3 Check Browser Console

1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for any errors
4. Verify Supabase connection is working

## Troubleshooting

### Build Fails

**Error: "node scripts/generate-config.js" not found**
- Solution: Ensure `scripts/generate-config.js` exists and is committed to Git

**Error: Environment variables not set**
- Solution: Go to Netlify Dashboard → Site settings → Environment variables
- Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set
- Trigger a new deployment after adding variables

### Environment Variables Not Working

**supabase-config.js is empty or has undefined values**
- Solution: 
  1. Check environment variables are set in Netlify
  2. Trigger a new deployment
  3. Check build logs to see if variables are being read

### Domain Not Working

**DNS not resolving**
- Solution:
  1. Verify DNS records are correct at your registrar
  2. Wait for DNS propagation (can take up to 48 hours)
  3. Use https://www.whatsmydns.net/ to check propagation

**SSL certificate not issued**
- Solution:
  1. Ensure DNS is fully propagated
  2. Wait 10-15 minutes after DNS verification
  3. Check Netlify Dashboard → Domain management for SSL status

### Supabase Connection Errors

**"Supabase client not initialized"**
- Solution:
  1. Verify environment variables are set correctly
  2. Check build logs to ensure supabase-config.js was generated
  3. Verify the generated file has correct values

**Authentication errors**
- Solution:
  1. Verify Supabase project is active
  2. Check Supabase Dashboard → Authentication → Providers
  3. Ensure email provider is enabled

## Post-Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] Netlify site created and connected to GitHub
- [ ] Environment variables set in Netlify
- [ ] Build script runs successfully
- [ ] Site deployed successfully
- [ ] All features tested on Netlify URL
- [ ] Custom domain added (if applicable)
- [ ] DNS records configured (if applicable)
- [ ] SSL certificate provisioned (if applicable)
- [ ] Site tested on custom domain (if applicable)
- [ ] HTTPS working correctly
- [ ] No console errors
- [ ] All features working in production

## Quick Commands Reference

```bash
# Initialize Git (if needed)
git init
git add .
git commit -m "Ready for deployment"

# Push to GitHub
git remote add origin https://github.com/YOUR_USERNAME/bloomly-app.git
git branch -M main
git push -u origin main

# Test build script locally
node scripts/generate-config.js

# Check if supabase-config.js was generated
cat supabase-config.js
```

## Support

If you encounter issues:

1. Check Netlify build logs: Dashboard → Deploys → Click on deployment
2. Check browser console for client-side errors
3. Verify Supabase Dashboard for backend errors
4. Review this guide's troubleshooting section

## Next Steps

After successful deployment:

1. Set up monitoring (optional): Netlify Analytics
2. Configure backups: Regular database backups in Supabase
3. Set up error tracking: Consider Sentry or similar
4. Enable CDN caching: Already configured in netlify.toml
5. Monitor usage: Check Supabase Dashboard for usage limits

---

**Deployment Status:** Ready for deployment
**Last Updated:** $(date)

