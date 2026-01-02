# Admin Panel Setup Guide

This admin panel allows you to manage your blog posts using GitHub OAuth authentication.

## Step 1: Create GitHub OAuth App

1. Go to GitHub → Settings → Developer settings → OAuth Apps
   - Direct link: https://github.com/settings/developers

2. Click "New OAuth App"

3. Fill in the form:
   - **Application name**: `Bloomly Admin` (or any name you prefer)
   - **Homepage URL**: `https://bloomly.co.ke` (your domain)
   - **Authorization callback URL**: `https://bloomly.co.ke/admin/callback.html`
   - **Application description**: (optional) "Blog admin panel for Bloomly"

4. Click "Register application"

5. **Important**: Copy these values:
   - **Client ID** (you'll see this immediately)
   - **Client Secret** (click "Generate a new client secret" and copy it)

## Step 2: Configure Admin Panel

1. Open `admin/config.js` in your project

2. Replace the placeholder values:
   ```javascript
   clientId: 'YOUR_GITHUB_CLIENT_ID_HERE',  // Replace with your Client ID
   clientSecret: 'YOUR_GITHUB_CLIENT_SECRET_HERE',  // Replace with your Client Secret
   ```

3. Verify other settings are correct:
   - `repoOwner`: `'Emmanueld14'` (your GitHub username)
   - `repoName`: `'bloomly-app'` (your repository name)
   - `repoBranch`: `'main'` (your default branch)

## Step 3: Deploy Changes

1. Commit and push the admin files to GitHub:
   ```bash
   git add admin/
   git commit -m "Add admin panel with GitHub OAuth"
   git push origin main
   ```

2. Cloudflare Pages will automatically deploy the changes

## Step 4: Access Admin Panel

1. Go to: `https://bloomly.co.ke/admin` (or `https://your-pages-url.pages.dev/admin`)

2. Click "Login with GitHub"

3. Authorize the application

4. You'll be redirected back to the admin panel

## Features

- **View all blog posts**: See a list of all markdown files in `content/blog/`
- **Edit posts**: Click "Edit" to open the post in GitHub's web editor
- **Add new posts**: Click "Add New Post" to create a new markdown file
- **Delete posts**: Click "Delete" to remove a blog post (requires confirmation)

## Security Notes

⚠️ **Important**: The client secret is stored client-side in this implementation. For production use, consider:
- Using environment variables
- Implementing a backend proxy for OAuth token exchange
- Using GitHub's server-to-server authentication

For a personal blog, the current implementation is acceptable, but keep your client secret secure and don't commit it to public repositories.

## Troubleshooting

### "Please configure GitHub OAuth credentials"
- Make sure you've updated `admin/config.js` with your Client ID and Secret

### "Authentication failed"
- Check that your Authorization callback URL matches exactly: `https://bloomly.co.ke/admin/callback.html`
- Verify your Client ID and Secret are correct

### "Failed to load posts"
- Make sure your GitHub token has `repo` scope
- Verify your repository name and owner are correct in `config.js`

### Posts don't appear after editing
- Cloudflare Pages auto-deploys on GitHub commits (usually within 1-2 minutes)
- Check Cloudflare Pages dashboard for deployment status

