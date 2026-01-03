# Render.com Setup Instructions

Render.com is easier to set up than Vercel for this use case. Follow these steps:

## Step 1: Create Render Account

1. Go to [render.com](https://render.com)
2. Sign up with your GitHub account (same as your repo)
3. Complete the setup

## Step 2: Create Web Service

1. In Render dashboard, click **"New +"** → **"Web Service"**
2. Connect your GitHub repository: `Emmanueld14/bloomly-app`
3. Configure:
   - **Name**: `bloomly-oauth-api` (or any name)
   - **Region**: Choose closest to you
   - **Branch**: `main`
   - **Root Directory**: `render-api`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: **Free** (select this!)

## Step 3: Add Environment Variables

In the Render dashboard for your service:

1. Go to **"Environment"** tab
2. Add these variables:
   - `GITHUB_CLIENT_ID` = `Ov23ligFSm5nzRevPd41`
   - `GITHUB_CLIENT_SECRET` = `c0a23cbd55971a7270d4def0c3384c7d96e74404`
3. Click **"Save Changes"**

## Step 4: Deploy

1. Click **"Create Web Service"**
2. Wait for deployment (2-3 minutes)
3. Copy your Render URL (e.g., `https://bloomly-oauth-api.onrender.com`)

## Step 5: Update Config

1. Update `admin/config.js`:
   ```javascript
   vercelApiUrl: 'https://YOUR-RENDER-URL.onrender.com/api/github-auth'
   ```

2. Commit and push:
   ```bash
   git add admin/config.js
   git commit -m "Update API URL to Render"
   git push origin main
   ```

## Step 6: Test

1. Test endpoint: `https://YOUR-RENDER-URL.onrender.com/api/test`
2. Should return: `{"message":"Render API is working!","timestamp":"..."}`
3. Try logging in at `/admin/`

## Notes

- Render free tier spins down after 15 minutes of inactivity
- First request after spin-down takes ~30 seconds (cold start)
- After that, it's fast
- For production, consider Render's paid tier ($7/month) for always-on

## Troubleshooting

- **404 errors**: Check that Root Directory is set to `render-api`
- **Environment variables not working**: Make sure you saved them and redeployed
- **Slow first request**: Normal on free tier (cold start)

