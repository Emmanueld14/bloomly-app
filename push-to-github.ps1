# Quick GitHub Push Script
# This script will help you push to GitHub using your token

Write-Host "🚀 Bloomly GitHub Push Setup" -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan
Write-Host ""

# Get GitHub username
$username = Read-Host "Enter your GitHub username"

# Get repository name
$repoName = Read-Host "Enter repository name (e.g., bloomly-app)"

Write-Host ""
Write-Host "⚠️  IMPORTANT: Make sure you've created the repository on GitHub first!" -ForegroundColor Yellow
Write-Host "   Go to: https://github.com/new" -ForegroundColor Yellow
Write-Host "   Create repository: $repoName" -ForegroundColor Yellow
Write-Host "   DO NOT initialize with README" -ForegroundColor Yellow
Write-Host ""

$continue = Read-Host "Have you created the repository? (y/n)"
if ($continue -ne 'y' -and $continue -ne 'Y') {
    Write-Host "Please create the repository first, then run this script again." -ForegroundColor Red
    exit
}

# Token (already provided)
$token = "YOUR_GITHUB_TOKEN_HERE"
$remoteUrl = "https://${token}@github.com/${username}/${repoName}.git"

Write-Host ""
Write-Host "📦 Setting up remote..." -ForegroundColor Cyan

# Check if remote exists
$ErrorActionPreference = 'SilentlyContinue'
$remoteCheck = git remote get-url origin
$ErrorActionPreference = 'Continue'

if ($LASTEXITCODE -eq 0 -and $remoteCheck) {
    Write-Host "ℹ️  Remote 'origin' already exists" -ForegroundColor Yellow
    git remote set-url origin $remoteUrl
    Write-Host "✅ Remote updated" -ForegroundColor Green
} else {
    git remote add origin $remoteUrl
    Write-Host "✅ Remote added" -ForegroundColor Green
}

Write-Host ""
Write-Host "📤 Pushing to GitHub..." -ForegroundColor Cyan
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ SUCCESS! Code pushed to GitHub!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Repository URL: https://github.com/$username/$repoName" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "📋 Next Steps:" -ForegroundColor Cyan
    Write-Host "1. Go to https://app.netlify.com" -ForegroundColor White
    Write-Host "2. Click 'Add new site' → 'Import an existing project'" -ForegroundColor White
    Write-Host "3. Select 'Deploy with GitHub'" -ForegroundColor White
    Write-Host "4. Choose repository: $repoName" -ForegroundColor White
    Write-Host "5. Click 'Deploy site'" -ForegroundColor White
    Write-Host "6. Add environment variables in Netlify Dashboard" -ForegroundColor White
    Write-Host ""
    Write-Host "See NETLIFY_DEPLOYMENT.md for detailed instructions" -ForegroundColor Gray
} else {
    Write-Host ""
    Write-Host "❌ Failed to push" -ForegroundColor Red
    Write-Host ""
    Write-Host "Possible issues:" -ForegroundColor Yellow
    Write-Host "- Repository doesn't exist: https://github.com/$username/$repoName" -ForegroundColor White
    Write-Host "- Token doesn't have correct permissions" -ForegroundColor White
    Write-Host "- Network connection issue" -ForegroundColor White
    Write-Host ""
    Write-Host "Try creating the repository first, then run this script again." -ForegroundColor Yellow
}
