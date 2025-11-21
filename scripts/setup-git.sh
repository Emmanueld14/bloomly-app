#!/bin/bash
# Git Setup Script for Bloomly Deployment
# This script helps set up Git and prepare for GitHub push

echo "🚀 Bloomly Git Setup Script"
echo "============================"
echo ""

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Please install Git first."
    exit 1
fi

echo "✅ Git is installed"
echo ""

# Check if already a git repository
if [ -d ".git" ]; then
    echo "ℹ️  Git repository already initialized"
    read -p "Do you want to continue? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo "📦 Initializing Git repository..."
    git init
    echo "✅ Git repository initialized"
fi

echo ""
echo "📝 Adding all files..."
git add .

echo ""
echo "💾 Creating initial commit..."
git commit -m "Initial commit - Ready for Netlify deployment"

echo ""
echo "✅ Files committed"
echo ""
echo "📋 Next steps:"
echo "1. Create a repository on GitHub: https://github.com/new"
echo "2. Run these commands (replace YOUR_USERNAME with your GitHub username):"
echo ""
echo "   git remote add origin https://github.com/YOUR_USERNAME/bloomly-app.git"
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""
echo "Or run: ./scripts/push-to-github.sh YOUR_USERNAME bloomly-app"
echo ""

