# Fix Render Free Tier "Sleeping" Issue

Render's free tier services automatically "sleep" after 15 minutes of inactivity to save resources. When sleeping, the first request takes 30-60 seconds to wake up.

## Impact

### ✅ Blog Page (NOT Affected)
- The blog page loads posts directly from GitHub API
- Render sleeping does NOT affect blog loading
- Your blog should work fine even if Render is sleeping

### ❌ Admin Login (AFFECTED)
- Admin login uses Render for OAuth token exchange
- If Render is sleeping, login will be slow or fail
- First login attempt after sleep takes 30-60 seconds

## Solutions

### Option 1: Keep Render Awake (Recommended for Active Use)
Use a free service to ping your Render URL every 10-14 minutes:

1. **UptimeRobot** (Free):
   - Go to https://uptimerobot.com
   - Sign up (free)
   - Add Monitor:
     - Type: HTTP(s)
     - URL: `https://bloomly-app.onrender.com/api/test`
     - Interval: 5 minutes
   - This keeps Render awake 24/7

2. **Cron-Job.org** (Free):
   - Go to https://cron-job.org
   - Create job:
     - URL: `https://bloomly-app.onrender.com/api/test`
     - Schedule: Every 10 minutes
   - This keeps Render awake

### Option 2: Upgrade Render (Paid - $7/month)
- Render's paid tier keeps services always-on
- No sleep/wake delays
- Better for production use

### Option 3: Accept the Delay
- First login after sleep takes 30-60 seconds
- Subsequent logins are fast (service stays awake)
- Free but slower experience

## Quick Test

To test if Render is awake:
1. Visit: `https://bloomly-app.onrender.com/api/test`
2. If it responds quickly (< 2 seconds) → Awake ✅
3. If it takes 30-60 seconds → Waking up ⏳
4. If it fails → Check Render dashboard

## For Blog Issues

If you're still seeing old posts on the blog page, it's NOT because of Render sleeping. It's likely:
1. Browser cache - Clear it using `/blog-cache-clear.html`
2. Cloudflare cache - Wait 5-10 minutes or purge in Cloudflare dashboard
3. GitHub API rate limit - Wait a few minutes and retry

