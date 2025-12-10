# GitHub Pages Setup Guide for Bloomly

## Quick Setup Steps

### Step 1: Enable GitHub Pages

1. Go to your GitHub repository: `https://github.com/Emmanueld14/bloomly-app`
2. Click on **Settings** (top menu)
3. Scroll down to **Pages** in the left sidebar
4. Under **Source**, select:
   - **Branch**: `main`
   - **Folder**: `/ (root)`
5. Click **Save**

### Step 2: Wait for Deployment

- GitHub Pages will automatically deploy your site
- It usually takes 1-2 minutes
- You'll see a green checkmark when it's ready

### Step 3: Access Your Site

Your site will be available at:
- **URL**: `https://Emmanueld14.github.io/bloomly-app/`

### Step 4: Set Custom Domain (Optional)

If you want to use `bloomly.co.ke`:

#### Option A: Use Apex Domain (bloomly.co.ke)

1. **Create CNAME file in repository:**
   - Create a file named `CNAME` (no extension) in the root directory
   - Add this line: `bloomly.co.ke`
   - Commit and push to GitHub

2. **In GitHub Pages settings:**
   - Go to Settings → Pages
   - Under "Custom domain", enter: `bloomly.co.ke`
   - Click Save
   - Enable "Enforce HTTPS" (after DNS propagates)

3. **Update DNS records at your domain registrar:**
   
   Add **4 A records** (all are required):
   
   | Type | Host/Name | Value | TTL |
   |------|-----------|-------|-----|
   | A | `@` or blank | `185.199.108.153` | 3600 |
   | A | `@` or blank | `185.199.109.153` | 3600 |
   | A | `@` or blank | `185.199.110.153` | 3600 |
   | A | `@` or blank | `185.199.111.153` | 3600 |

#### Option B: Use WWW Subdomain (www.bloomly.co.ke)

1. **Create CNAME file in repository:**
   - Create a file named `CNAME` (no extension) in the root directory
   - Add this line: `www.bloomly.co.ke`
   - Commit and push to GitHub

2. **In GitHub Pages settings:**
   - Go to Settings → Pages
   - Under "Custom domain", enter: `www.bloomly.co.ke`
   - Click Save

3. **Update DNS records at your domain registrar:**
   
   Add **1 CNAME record**:
   
   | Type | Host/Name | Value | TTL |
   |------|-----------|-------|-----|
   | CNAME | `www` | `Emmanueld14.github.io` | 3600 |

#### Option C: Use Both (Recommended)

Use both apex domain and www subdomain:

1. **Create CNAME file:** `bloomly.co.ke` (apex domain)
2. **Add DNS records:**
   - 4 A records for `@` (apex domain)
   - 1 CNAME record for `www` → `Emmanueld14.github.io`
3. **In GitHub Pages:** Enter `bloomly.co.ke` (it will handle both)

**Note:** DNS changes can take up to 24 hours to propagate. Be patient!

## How It Works

### File Structure
- All files are served from the root directory
- GitHub Pages automatically serves `index.html` as the homepage
- The `404.html` file handles routing for blog posts and admin

### Blog Post Routing
- Blog posts are accessed via: `/blog-post.html?slug=post-name`
- The `blog-loader.js` automatically converts `/blog/[slug]` links to use query parameters
- This works seamlessly with GitHub Pages

### Admin CMS
- Access at: `/admin/index.html` or `/admin/`
- The `404.html` handles the redirect automatically

## Differences from Netlify

### What Changed
- ✅ No build command needed (static site)
- ✅ No environment variables needed
- ✅ Simpler deployment (just push to GitHub)
- ✅ Free hosting included with GitHub

### What's Different
- ⚠️ Blog post URLs use query parameters (`?slug=`) instead of paths
- ⚠️ Admin redirect handled via `404.html` instead of `netlify.toml`
- ⚠️ No server-side redirects (handled client-side)

## Troubleshooting

### Site not loading
- Check GitHub Pages settings (Source = main branch, / root)
- Wait a few minutes for deployment
- Check the Actions tab for deployment status

### Blog posts not working
- Ensure `blog-post-loader.js` is loading correctly
- Check browser console for errors
- Verify markdown files are in `/content/blog/`

### Admin not accessible
- Try `/admin/index.html` directly
- Check that `admin/index.html` exists
- Verify `404.html` is in the root directory

## Need Help?

- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Custom Domain Setup](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)

---

**Note**: The site is now configured for GitHub Pages. All Netlify-specific configurations have been preserved but are no longer needed.

