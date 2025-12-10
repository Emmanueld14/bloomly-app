# Simple GitHub Push Script - Fixed Version
param(
    [Parameter(Mandatory=$false)]
    [string]$Username = "",
    
    [Parameter(Mandatory=$false)]
    [string]$RepoName = ""
)

$token = "YOUR_GITHUB_TOKEN_HERE"

if (-not $Username) {
    $Username = Read-Host "Enter your GitHub username"
}

if (-not $RepoName) {
    $RepoName = Read-Host "Enter repository name (e.g., bloomly-app)"
}

Write-Host ""
Write-Host "⚠️  Make sure repository exists: https://github.com/$Username/$RepoName" -ForegroundColor Yellow
Write-Host ""

$remoteUrl = "https://${token}@github.com/${Username}/${RepoName}.git"

# Remove existing remote if it exists, then add new one
git remote remove origin 2>$null
git remote add origin $remoteUrl

Write-Host "📤 Pushing to GitHub..." -ForegroundColor Cyan
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ SUCCESS! Pushed to: https://github.com/$Username/$RepoName" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next: Deploy to Netlify at https://app.netlify.com" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "❌ Push failed. Check:" -ForegroundColor Red
    Write-Host "   - Repository exists on GitHub" -ForegroundColor Yellow
    Write-Host "   - Token has correct permissions" -ForegroundColor Yellow
}


