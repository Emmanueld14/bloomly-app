# Vercel Setup Instructions for GitHub OAuth

To enable GitHub OAuth login for your admin panel, you need to deploy the API function to Vercel (free tier).

## Step 1: Create Vercel Account

1. Go to [vercel.com](https://vercel.com)
2. Sign up with your GitHub account (same account as your repository)
3. Complete the setup

## Step 2: Deploy API Function

1. In Vercel dashboard, click **"Add New Project"**
2. Import your GitHub repository: `Emmanueld14/bloomly-app`
3. Vercel will auto-detect the `api/` folder
4. Click **"Deploy"**

## Step 3: Add Environment Variables

1. Go to your project settings in Vercel
2. Navigate to **"Environment Variables"**
3. Add these two variables:
   - `GITHUB_CLIENT_ID` = `Ov23ligFSm5nzRevPd41`
   - `GITHUB_CLIENT_SECRET` = `c0a23cbd55971a7270d4def0c3384c7d96e74404`
4. Click **"Save"**
5. **Redeploy** your project (Vercel → Deployments → Redeploy)

## Step 4: Update API URL

After deployment, Vercel will give you a URL like: `https://bloomly-app-xxxxx.vercel.app`

1. Update `admin/callback.html` line 72:
   ```javascript
   const apiUrl = 'https://YOUR-VERCEL-URL.vercel.app/api/github-auth';
   ```

2. Or better: Update `admin/config.js` to include the API URL:
   ```javascript
   apiBase: 'https://api.github.com',
   vercelApiUrl: 'https://YOUR-VERCEL-URL.vercel.app/api/github-auth'
   ```

## Step 5: Test

1. Go to `/admin/` on your Cloudflare Pages site
2. Click **"Login with GitHub"**
3. Authorize the app
4. You should be redirected back and logged in!

## Troubleshooting

- **"Failed to exchange token"**: Check that environment variables are set correctly in Vercel
- **CORS errors**: Make sure the API URL in `callback.html` matches your Vercel deployment URL
- **Function not found**: Ensure the `api/github-auth.js` file exists and Vercel has redeployed

## Alternative: Use Without Vercel

If you prefer not to use Vercel, you can:
1. Use GitHub Personal Access Tokens (current method)
2. Set up a different serverless function provider (Railway, Render, etc.)
3. Use Cloudflare Workers (paid tier)

