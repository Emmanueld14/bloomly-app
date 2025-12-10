# Owner Action Required: Setup GitHub OAuth for Netlify CMS

## ⚠️ Important Update

**Netlify Identity has been deprecated** (as of December 2025) and is no longer available for new setups.

We've updated your CMS to use **GitHub OAuth** instead, which is simpler and more secure!

## Quick Setup Steps

### Step 1: Create GitHub OAuth App

1. Go to: https://github.com/settings/developers
2. Click **"OAuth Apps"** → **"New OAuth App"**
3. Fill in:
   - **Application name**: `Bloomly CMS`
   - **Homepage URL**: `https://bloomly.co.ke`
   - **Authorization callback URL**: `https://bloomly.co.ke/admin`
4. Click **"Register application"**
5. **Copy the Client ID**
6. Click **"Generate a new client secret"**
7. **Copy the Client Secret** (save it - you'll only see it once!)

### Step 2: Add to Netlify Environment Variables

1. Go to: https://app.netlify.com
2. Select your site (bloomlyhub)
3. Go to **Site settings** → **Environment variables**
4. Add these two variables:
   - `GITHUB_CLIENT_ID` = (your Client ID)
   - `GITHUB_CLIENT_SECRET` = (your Client Secret)
5. Click **"Save"**

### Step 3: Access the CMS

1. Go to: `https://bloomly.co.ke/admin`
2. Click **"Login with GitHub"**
3. Authorize the app
4. Start creating blog posts!

**See `SETUP_GITHUB_CMS.md` for detailed instructions.**

## What This Enables

✅ **Blog Publishing**: Create, edit, and publish blog posts directly from the web interface  
✅ **No Code Required**: Write posts in a user-friendly editor  
✅ **Live Preview**: See how your posts will look before publishing  
✅ **Image Uploads**: Upload featured images directly through the CMS  
✅ **Git Integration**: All changes are automatically committed to your GitHub repository  

## Troubleshooting

### Can't access /admin
- Make sure Identity is enabled
- Check that Git Gateway is enabled
- Verify you've accepted the invitation email

### Login not working
- Clear your browser cache
- Try logging in from an incognito/private window
- Make sure you've set a password after accepting the invitation

### Changes not saving
- Verify Git Gateway is enabled
- Check that your GitHub repository is properly connected to Netlify
- Ensure you have write permissions to the repository

## Need Help?

- [Netlify Identity Documentation](https://docs.netlify.com/visitor-access/identity/)
- [Netlify CMS Documentation](https://www.netlifycms.org/docs/)
- [Git Gateway Setup Guide](https://www.netlifycms.org/docs/git-gateway-backend/)

---

**Note**: This site uses **only** Netlify Identity and Git Gateway for authentication. All old authentication systems (Supabase, Firebase, SuperBiz) have been removed.

