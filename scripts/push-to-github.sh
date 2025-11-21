#!/bin/bash
# Push to GitHub Script
# Usage: ./scripts/push-to-github.sh YOUR_USERNAME REPO_NAME

if [ -z "$1" ] || [ -z "$2" ]; then
    echo "❌ Usage: ./scripts/push-to-github.sh YOUR_USERNAME REPO_NAME"
    echo "   Example: ./scripts/push-to-github.sh johndoe bloomly-app"
    exit 1
fi

USERNAME=$1
REPO_NAME=$2

echo "🚀 Pushing to GitHub..."
echo "Repository: https://github.com/$USERNAME/$REPO_NAME"
echo ""

# Check if remote already exists
if git remote get-url origin &> /dev/null; then
    echo "ℹ️  Remote 'origin' already exists"
    read -p "Do you want to update it? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git remote set-url origin "https://github.com/$USERNAME/$REPO_NAME.git"
    fi
else
    git remote add origin "https://github.com/$USERNAME/$REPO_NAME.git"
fi

# Rename branch to main
git branch -M main

# Push to GitHub
echo "📤 Pushing to GitHub..."
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Successfully pushed to GitHub!"
    echo "   Repository: https://github.com/$USERNAME/$REPO_NAME"
    echo ""
    echo "📋 Next steps:"
    echo "1. Go to https://app.netlify.com"
    echo "2. Click 'Add new site' → 'Import an existing project'"
    echo "3. Select 'Deploy with GitHub'"
    echo "4. Choose your repository: $REPO_NAME"
else
    echo ""
    echo "❌ Failed to push to GitHub"
    echo "   Make sure:"
    echo "   - Repository exists on GitHub"
    echo "   - You have push access"
    echo "   - You're authenticated (use Personal Access Token if needed)"
fi

