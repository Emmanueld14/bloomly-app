# Owner Action Required: Enable Netlify Identity & Git Gateway

## Quick Setup Steps

To enable blog publishing via Netlify CMS, you need to complete these steps in your Netlify dashboard:

### Step 1: Enable Netlify Identity

1. Go to your Netlify site dashboard: https://app.netlify.com
2. Select your Bloomly site
3. Navigate to **Identity** in the left sidebar
4. Click **Enable Identity**
5. Wait for Identity to be enabled (this may take a few moments)

### Step 2: Enable Git Gateway

1. Still in the **Identity** section
2. Scroll down to **Services** → **Git Gateway**
3. Click **Enable Git Gateway**
4. This allows the CMS to commit changes directly to your GitHub repository

### Step 3: Configure Registration (Recommended: Invite Only)

1. In the **Identity** section, go to **Settings**
2. Under **Registration preferences**, select **Invite only**
3. This ensures only invited users can access the CMS

### Step 4: Invite Yourself

1. In the **Identity** section, click **Invite users**
2. Enter your email address
3. Click **Send invite**
4. Check your email and click the invitation link
5. Set a password for your account

### Step 5: Access the CMS

After accepting the invitation, you can log in at:

**https://YOUR-SITE-NAME.netlify.app/admin**

Replace `YOUR-SITE-NAME` with your actual Netlify site name.

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

