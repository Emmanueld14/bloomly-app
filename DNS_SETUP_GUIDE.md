# DNS Setup Guide for bloomly.co.ke

## Current Status
✅ CNAME file is correct: `bloomly.co.ke`  
❌ DNS records need to be added at your domain registrar  
⚠️ GitHub Pages is checking both `bloomly.co.ke` and `www.bloomly.co.ke`

## Step-by-Step Fix

### Step 1: Go to Your Domain Registrar
Log in to where you bought `bloomly.co.ke` (e.g., Namecheap, GoDaddy, Cloudflare, etc.)

### Step 2: Find DNS Management
Look for:
- "DNS Management"
- "DNS Settings"
- "Name Servers"
- "DNS Records"

### Step 3: Add DNS Records

#### For `bloomly.co.ke` (apex domain):
Add **4 A records** (all are required):

| Type | Host/Name | Value | TTL |
|------|-----------|-------|-----|
| A | `@` | `185.199.108.153` | 3600 (or Auto) |
| A | `@` | `185.199.109.153` | 3600 (or Auto) |
| A | `@` | `185.199.110.153` | 3600 (or Auto) |
| A | `@` | `185.199.111.153` | 3600 (or Auto) |

**Note:** Some registrars use `@` for the root domain, others use a blank field or `bloomly.co.ke`

#### For `www.bloomly.co.ke` (www subdomain):
Add **1 CNAME record**:

| Type | Host/Name | Value | TTL |
|------|-----------|-------|-----|
| CNAME | `www` | `Emmanueld14.github.io` | 3600 (or Auto) |

### Step 4: Save Changes
Click "Save" or "Update" at your domain registrar.

### Step 5: Wait for DNS Propagation
- DNS changes can take **5 minutes to 24 hours** to propagate
- Usually takes **15-30 minutes** for most registrars

### Step 6: Verify on GitHub
1. Go back to: `https://github.com/Emmanueld14/bloomly-app/settings/pages`
2. Click **"Check again"** button next to the DNS error
3. Wait a few minutes and check again if needed

### Step 7: Enable HTTPS
Once DNS is verified (green checkmark):
1. Check the **"Enforce HTTPS"** checkbox
2. Your site will be available at `https://bloomly.co.ke` and `https://www.bloomly.co.ke`

## Common Issues

### Issue: "InvalidDNSError" for www.bloomly.co.ke
**Solution:** Make sure you added the CNAME record for `www` pointing to `Emmanueld14.github.io`

### Issue: DNS not updating
**Solution:** 
- Wait longer (up to 24 hours)
- Check if your domain registrar has DNS caching
- Try clearing your browser cache

### Issue: Can't find DNS settings
**Solution:**
- Look for "Advanced DNS" or "DNS Records" in your domain dashboard
- Contact your domain registrar's support if needed

## Quick Checklist
- [ ] Added 4 A records for `@` (apex domain)
- [ ] Added 1 CNAME record for `www` → `Emmanueld14.github.io`
- [ ] Saved DNS changes at registrar
- [ ] Waited 15-30 minutes
- [ ] Clicked "Check again" on GitHub Pages
- [ ] Enabled "Enforce HTTPS" after DNS verified

## Need Help?
If you're stuck, tell me:
1. Which domain registrar you're using (Namecheap, GoDaddy, etc.)
2. What you see in your DNS management panel
3. Any error messages

