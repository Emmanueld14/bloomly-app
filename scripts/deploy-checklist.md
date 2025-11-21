# Deployment Checklist

Use this checklist to track your deployment progress.

## Pre-Deployment

- [ ] All code changes committed
- [ ] `netlify.toml` updated
- [ ] `scripts/generate-config.js` created
- [ ] `.gitignore` includes `supabase-config.js`
- [ ] Admin role removed from signup

## GitHub Setup

- [ ] Git repository initialized
- [ ] All files committed
- [ ] GitHub repository created
- [ ] Code pushed to GitHub
- [ ] Repository is public or Netlify has access

## Netlify Setup

- [ ] Netlify account created/logged in
- [ ] Site created from GitHub repository
- [ ] Build settings configured
- [ ] Initial deployment successful

## Environment Variables

- [ ] `SUPABASE_URL` added to Netlify
- [ ] `SUPABASE_ANON_KEY` added to Netlify
- [ ] New deployment triggered after adding variables
- [ ] Build logs show config file generated successfully

## Domain Configuration (Optional)

- [ ] Custom domain added in Netlify
- [ ] DNS records configured at registrar
- [ ] DNS propagation verified
- [ ] SSL certificate provisioned
- [ ] HTTPS working on custom domain

## Testing

- [ ] Site loads on Netlify URL
- [ ] Sign up works
- [ ] Login works
- [ ] Chat with Deborah works
- [ ] Journal entries save
- [ ] Mood tracking works
- [ ] All features tested
- [ ] No console errors
- [ ] Mobile responsive

## Post-Deployment

- [ ] Custom domain tested (if applicable)
- [ ] SSL certificate verified
- [ ] All features working in production
- [ ] Monitoring set up (optional)
- [ ] Documentation updated

---

**Status:** Ready to start deployment
**Start Date:** _______________
**Completion Date:** _______________

