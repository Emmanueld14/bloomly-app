# HostAfrica DNS Setup for GitHub Pages

## Current Error
❌ "Domain does not resolve to the GitHub Pages server"  
❌ "NotServedByPagesError"

## Solution: Add DNS Records at HostAfrica

### Step 1: Log into HostAfrica DNS Manager

1. Go to your HostAfrica account
2. Navigate to **DNS Manager** (you have this tab open)
3. Find your domain: `bloomly.co.ke`

### Step 2: Add DNS Records

#### For `bloomly.co.ke` (Root Domain):
Add **4 A Records** (all are required):

| Type | Name/Host | Value/Points To | TTL |
|------|-----------|----------------|-----|
| A | `@` or blank | `185.199.108.153` | 3600 |
| A | `@` or blank | `185.199.109.153` | 3600 |
| A | `@` or blank | `185.199.110.153` | 3600 |
| A | `@` or blank | `185.199.111.153` | 3600 |

**In HostAfrica DNS Manager:**
- Click **"Add Record"** or **"New Record"**
- Select **Type: A**
- **Name/Host:** Leave blank or enter `@` (this means root domain)
- **Value/Points To:** `185.199.108.153`
- **TTL:** `3600` (or leave default)
- Click **Save**
- **Repeat 3 more times** with the other 3 IP addresses

#### For `www.bloomly.co.ke` (WWW Subdomain):
Add **1 CNAME Record**:

| Type | Name/Host | Value/Points To | TTL |
|------|-----------|----------------|-----|
| CNAME | `www` | `Emmanueld14.github.io` | 3600 |

**In HostAfrica DNS Manager:**
- Click **"Add Record"** or **"New Record"**
- Select **Type: CNAME**
- **Name/Host:** `www`
- **Value/Points To:** `Emmanueld14.github.io`
- **TTL:** `3600` (or leave default)
- Click **Save**

### Step 3: Remove Conflicting Records

**IMPORTANT:** Before adding new records, check if there are existing records:

1. **Look for existing A records** pointing to:
   - Netlify IPs (104.198.14.52, etc.)
   - Other hosting services
   - **Delete these old records first!**

2. **Look for existing CNAME records** for `www`:
   - If it points to Netlify or another service
   - **Delete it and replace with the GitHub Pages CNAME**

### Step 4: Verify Records

After adding all records, your DNS should look like:

```
Type    Name    Value                    TTL
A       @       185.199.108.153         3600
A       @       185.199.109.153         3600
A       @       185.199.110.153         3600
A       @       185.199.111.153         3600
CNAME   www     Emmanueld14.github.io   3600
```

### Step 5: Wait for DNS Propagation

- **Wait 15-30 minutes** for DNS to propagate
- DNS changes can take up to 24 hours, but usually work within 30 minutes

### Step 6: Verify on GitHub

1. Go back to: `https://github.com/Emmanueld14/bloomly-app/settings/pages`
2. Click **"Check again"** button
3. Wait a few minutes and check again if needed
4. Once verified, you'll see a green checkmark ✅
5. Then enable **"Enforce HTTPS"**

## Troubleshooting

### If "Check again" still shows error:
1. **Double-check DNS records** - Make sure all 4 A records and 1 CNAME are added
2. **Wait longer** - DNS can take up to 24 hours to fully propagate
3. **Verify records are correct** - Check for typos in IP addresses or CNAME value
4. **Check for conflicting records** - Make sure no old Netlify or other hosting records exist

### Verify DNS Records Online:
You can check if DNS is propagating using:
- https://dnschecker.org/#A/bloomly.co.ke
- https://www.whatsmydns.net/#A/bloomly.co.ke

Look for the 4 GitHub Pages IPs: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`

## Quick Checklist

- [ ] Logged into HostAfrica DNS Manager
- [ ] Deleted old/conflicting DNS records (if any)
- [ ] Added 4 A records for `@` with GitHub Pages IPs
- [ ] Added 1 CNAME record for `www` → `Emmanueld14.github.io`
- [ ] Saved all changes
- [ ] Waited 15-30 minutes
- [ ] Clicked "Check again" on GitHub Pages
- [ ] Enabled "Enforce HTTPS" after verification

## Still Having Issues?

If you're still getting errors after 30 minutes:
1. **Screenshot your DNS records** in HostAfrica DNS Manager
2. **Check DNS propagation** using dnschecker.org
3. **Verify CNAME file** in GitHub repo contains `bloomly.co.ke`

Let me know what you see!

