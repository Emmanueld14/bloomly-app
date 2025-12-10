# Push to GitHub - Quick Guide

## Option 1: Using PowerShell Script (Easiest)

1. **Create GitHub Repository First:**
   - Go to https://github.com/new
   - Repository name: `bloomly-app` (or your preferred name)
   - **DO NOT** initialize with README
   - Click "Create repository"

2. **Run the PowerShell script:**
   ```powershell
   .\scripts\push-to-github-with-token.ps1 YOUR_USERNAME REPO_NAME
   ```
   
   Example:
   ```powershell
   .\scripts\push-to-github-with-token.ps1 johndoe bloomly-app
   ```

## Option 2: Manual Git Commands

1. **Create GitHub Repository:**
   - Go to https://github.com/new
   - Create repository: `bloomly-app`
   - **DO NOT** initialize with README

2. **Add remote and push:**
   ```powershell
   # Replace YOUR_USERNAME and REPO_NAME
   $token = "YOUR_GITHUB_TOKEN_HERE"
   git remote add origin "https://${token}@github.com/YOUR_USERNAME/REPO_NAME.git"
   git checkout -b main
   git push -u origin main
   ```

## Option 3: Using GitHub CLI (if installed)

```powershell
gh repo create bloomly-app --public --source=. --remote=origin --push
```

## After Pushing

Once your code is on GitHub:

1. Go to https://app.netlify.com
2. Click "Add new site" → "Import an existing project"
3. Select "Deploy with GitHub"
4. Choose your repository
5. Deploy!

Then add environment variables in Netlify Dashboard.


