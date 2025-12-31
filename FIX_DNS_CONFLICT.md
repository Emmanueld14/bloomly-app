# Fix "Selected Zone is Already Taken" Error

## The Problem
Your domain `bloomly.co.ke` is still configured on **Netlify**, which is blocking GitHub Pages from using it. You need to remove it from Netlify first.

## Solution: Remove Domain from Netlify

### Step 1: Remove Domain from Netlify

1. **Go to Netlify Dashboard:**
   - Visit: https://app.netlify.com
   - Log in to your account

2. **Find Your Site:**
   - Look for the site that has `bloomly.co.ke` configured
   - Click on the site name

3. **Remove Custom Domain:**
   - Go to: **Site settings** → **Domain management**
   - Find `bloomly.co.ke` in the list
   - Click the **"Remove"** or **"X"** button next to it
   - Confirm removal

4. **Check Nameservers:**
   - If your domain is using Netlify's nameservers, you need to change them back
   - Go to your domain registrar
   - Change nameservers back to your registrar's default nameservers
   - (This might take a few hours to propagate)

### Step 2: Wait for DNS to Clear

- Wait **15-30 minutes** after removing from Netlify
- This allows DNS to clear the old Netlify configuration

### Step 3: Add DNS Records for GitHub Pages

Once the domain is removed from Netlify:

1. **Go to your domain registrar** (where you bought `bloomly.co.ke`)

2. **Add DNS Records:**

   **For `bloomly.co.ke` (apex domain):**
   - Add **4 A records**:
     - `@` → `185.199.108.153`
     - `@` → `185.199.109.153`
     - `@` → `185.199.110.153`
     - `@` → `185.199.111.153`

   **For `www.bloomly.co.ke`:**
   - Add **1 CNAME record**:
     - `www` → `Emmanueld14.github.io`

3. **Save changes**

### Step 4: Configure on GitHub Pages

1. Go to: `https://github.com/Emmanueld14/bloomly-app/settings/pages`
2. Under "Custom domain", enter: `bloomly.co.ke`
3. Click **Save**
4. Wait 15-30 minutes
5. Click **"Check again"** to verify DNS

## Alternative: Use Only WWW Subdomain

If you're still having issues, you can use **only** the `www` subdomain:

1. **Update CNAME file** to: `www.bloomly.co.ke`
2. **Add only CNAME record** at registrar: `www` → `Emmanueld14.github.io`
3. **In GitHub Pages:** Enter `www.bloomly.co.ke`

This avoids A record conflicts entirely.

## Quick Checklist

- [ ] Removed `bloomly.co.ke` from Netlify domain settings
- [ ] Changed nameservers back to registrar's default (if needed)
- [ ] Waited 15-30 minutes for DNS to clear
- [ ] Added 4 A records for `@` at domain registrar
- [ ] Added 1 CNAME record for `www` at domain registrar
- [ ] Configured domain in GitHub Pages settings
- [ ] Clicked "Check again" after waiting

## Still Having Issues?

Tell me:
1. **Have you removed the domain from Netlify?** (Yes/No)
2. **Which domain registrar are you using?** (Namecheap, GoDaddy, Cloudflare, etc.)
3. **What error message do you see now?**

