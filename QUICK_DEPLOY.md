# Quick Deploy Guide - Bloomly to Netlify

## 🚀 Fast Track Deployment (5 minutes)

### Step 1: Push to GitHub (2 minutes)

```bash
# If not already a git repo
git init
git add .
git commit -m "Ready for Netlify deployment"

# Create repo on GitHub first, then:
git remote add origin https://github.com/YOUR_USERNAME/bloomly-app.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy to Netlify (2 minutes)

1. Go to https://app.netlify.com
2. Click **"Add new site"** → **"Import an existing project"**
3. Click **"Deploy with GitHub"**
4. Select your repository
5. Click **"Deploy site"**

### Step 3: Add Environment Variables (1 minute)

1. Go to **Site settings** → **Environment variables**
2. Add:
   - `SUPABASE_URL` = `https://qifalarexcszkhwxzeir.supabase.co`
   - `SUPABASE_ANON_KEY` = `sb_publishable_oQuKmrT-0qwhGKsW0HdtzA__CnLadnL`
3. Go to **Deploys** → **"Trigger deploy"** → **"Deploy site"**

### Step 4: Test (1 minute)

Visit your Netlify URL and test:
- ✅ Sign up
- ✅ Login
- ✅ Chat with Deborah

**Done!** 🎉

---

For detailed instructions, see [NETLIFY_DEPLOYMENT.md](./NETLIFY_DEPLOYMENT.md)

