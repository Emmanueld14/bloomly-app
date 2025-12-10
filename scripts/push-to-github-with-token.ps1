# PowerShell script to push to GitHub with Personal Access Token
# Usage: .\scripts\push-to-github-with-token.ps1 YOUR_USERNAME REPO_NAME

param(
    [Parameter(Mandatory=$true)]
    [string]$Username,
    
    [Parameter(Mandatory=$true)]
    [string]$RepoName
)

$Token = "YOUR_GITHUB_TOKEN_HERE"
$RemoteUrl = "https://${Token}@github.com/${Username}/${RepoName}.git"

Write-Host "🚀 Pushing to GitHub..." -ForegroundColor Cyan
Write-Host "Repository: https://github.com/$Username/$RepoName" -ForegroundColor Yellow
Write-Host ""

# Check if remote already exists
$existingRemote = git remote get-url origin 2>$null
if ($existingRemote) {
    Write-Host "ℹ️  Remote 'origin' already exists: $existingRemote" -ForegroundColor Yellow
    $update = Read-Host "Do you want to update it? (y/n)"
    if ($update -eq 'y' -or $update -eq 'Y') {
        git remote set-url origin $RemoteUrl
        Write-Host "✅ Remote updated" -ForegroundColor Green
    }
} else {
    git remote add origin $RemoteUrl
    Write-Host "✅ Remote added" -ForegroundColor Green
}

# Switch to main branch if not already
$currentBranch = git branch --show-current
if ($currentBranch -ne "main") {
    Write-Host "📦 Switching to main branch..." -ForegroundColor Cyan
    git checkout -b main 2>$null
    if ($LASTEXITCODE -ne 0) {
        git checkout main
    }
}

# Push to GitHub
Write-Host ""
Write-Host "📤 Pushing to GitHub..." -ForegroundColor Cyan
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Successfully pushed to GitHub!" -ForegroundColor Green
    Write-Host "   Repository: https://github.com/$Username/$RepoName" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "📋 Next steps:" -ForegroundColor Cyan
    Write-Host "1. Go to https://app.netlify.com"
    Write-Host "2. Click 'Add new site' → 'Import an existing project'"
    Write-Host "3. Select 'Deploy with GitHub'"
    Write-Host "4. Choose your repository: $RepoName"
    Write-Host "5. Add environment variables in Netlify Dashboard"
} else {
    Write-Host ""
    Write-Host "❌ Failed to push to GitHub" -ForegroundColor Red
    Write-Host "   Make sure:" -ForegroundColor Yellow
    Write-Host "   - Repository exists on GitHub: https://github.com/$Username/$RepoName"
    Write-Host "   - You have push access to the repository"
    Write-Host "   - Token has correct permissions (repo scope)"
}


