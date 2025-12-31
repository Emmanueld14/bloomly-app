# Blog Admin Backend - Quick Reference

## 🎯 What You Have

A complete backend solution for your Netlify-hosted blog with:
- ✅ Custom admin panel at `/admin`
- ✅ Full CRUD operations (Create, Read, Update, Delete)
- ✅ Automatic markdown file generation
- ✅ Beautiful, modern UI

## ⚡ Quick Start

1. **Deploy to Netlify** (push your code to GitHub and connect to Netlify)

2. **Set up GitHub API** (for writing posts):
   - Create GitHub Personal Access Token
   - Add to Netlify: Site settings → Environment variables
   - Add: `GITHUB_TOKEN`, `GITHUB_REPO_OWNER`, `GITHUB_REPO_NAME`, `GITHUB_BRANCH`

3. **Access admin panel**: Go to `https://your-site.netlify.app/admin`

4. **Create a post**: Fill out the form and click "Save Post"

## 📋 Two API Versions

### Version 1: GitHub API (Recommended - Persists Changes)
- **File**: `netlify/functions/create-post-github.js`
- **Requires**: GitHub token in environment variables
- **How it works**: Commits files directly to your GitHub repository
- **Use when**: Production, need persistent storage

### Version 2: File System (Development Only)
- **File**: `netlify/functions/create-post.js`
- **Requires**: Nothing
- **How it works**: Writes to files (won't persist in Netlify Functions)
- **Use when**: Testing, development only

**Note**: Reading posts works with both versions. Writing requires GitHub API or a database.

## 🔧 Configuration

### Admin Panel Settings

In `admin/index.html`, you can toggle which API to use:

```javascript
const USE_GITHUB_API = true; // Set to false for file-based API
```

### Environment Variables (Netlify)

Required for GitHub API:
- `GITHUB_TOKEN` - Your GitHub personal access token
- `GITHUB_REPO_OWNER` - Your GitHub username
- `GITHUB_REPO_NAME` - Your repository name  
- `GITHUB_BRANCH` - Branch name (usually "main")

## 📚 Documentation

- **Quick Start**: [QUICK_START.md](./QUICK_START.md)
- **Full Setup Guide**: [BACKEND_SETUP.md](./BACKEND_SETUP.md)
- **Implementation Details**: [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)

## 🐛 Troubleshooting

### Posts Not Saving?

1. Check if you're using GitHub API version
2. Verify GitHub token is set in Netlify environment variables
3. Check Netlify Function logs for errors
4. Ensure repository name and owner are correct

### Admin Panel Not Loading?

1. Verify `/admin` redirects to `/admin/index.html` in `netlify.toml`
2. Check browser console for errors
3. Ensure all files are committed and pushed

### Functions Not Working?

1. Check Netlify Dashboard → Functions → Logs
2. Verify `netlify.toml` has correct function directory
3. Ensure functions are in `netlify/functions/` directory

## 🚀 Next Steps

- Add authentication for security
- Migrate to MongoDB for better scalability
- Add image upload functionality
- Add draft/publish status

---

**Status**: ✅ Ready to use

Follow [QUICK_START.md](./QUICK_START.md) to get started!

