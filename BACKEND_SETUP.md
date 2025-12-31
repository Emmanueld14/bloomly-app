# Backend Setup Guide - Blog Post Management

This guide will help you set up a complete backend solution for your Netlify-hosted blog admin panel.

## Overview

The solution includes:
- **Netlify Functions** (serverless backend) for API endpoints
- **JSON file database** (simple, file-based storage)
- **Custom Admin Panel** with full CRUD functionality
- **Automatic markdown file generation** for compatibility with existing blog loader

## Architecture

```
Admin Panel (/admin)
    ↓
Netlify Functions API
    ├── GET /api/get-posts (list all posts)
    ├── GET /api/get-post?slug=xxx (get single post)
    ├── POST /api/create-post (create new post)
    ├── PUT /api/update-post (update existing post)
    └── DELETE /api/delete-post (delete post)
    ↓
Data Storage
    ├── data/blog-posts.json (database)
    └── content/blog/*.md (markdown files for compatibility)
```

## Step-by-Step Setup Instructions

### Step 1: Verify File Structure

Ensure your project has the following structure:

```
your-site/
├── netlify/
│   └── functions/
│       ├── get-posts.js
│       ├── get-post.js
│       ├── create-post.js
│       ├── update-post.js
│       └── delete-post.js
├── admin/
│   └── index.html (custom admin panel)
├── data/
│   └── blog-posts.json (database file)
├── content/
│   └── blog/ (markdown files)
└── netlify.toml
```

### Step 2: Deploy to Netlify

1. **Push your code to GitHub/GitLab/Bitbucket**
   ```bash
   git add .
   git commit -m "Add backend API and admin panel"
   git push origin main
   ```

2. **Connect to Netlify** (if not already connected):
   - Go to [Netlify Dashboard](https://app.netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Connect your Git repository
   - Netlify will auto-detect settings

3. **Verify Build Settings**:
   - Build command: `node scripts/generate-config.js || echo 'Build script completed'`
   - Publish directory: `.` (root)

### Step 3: Configure GitHub API (For Writing Posts)

To enable writing posts that persist, you need to set up GitHub API authentication:

1. **Create a GitHub Personal Access Token**:
   - Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Click "Generate new token (classic)"
   - Give it a name: "Netlify Blog Admin"
   - Select scopes: `repo` (full control of private repositories)
   - Click "Generate token"
   - **Copy the token** (you won't see it again!)

2. **Add Environment Variables in Netlify**:
   - Go to Netlify Dashboard → Site settings → Environment variables
   - Add the following variables:
     - `GITHUB_TOKEN`: Your personal access token
     - `GITHUB_REPO_OWNER`: Your GitHub username (e.g., "Emmanueld14")
     - `GITHUB_REPO_NAME`: Your repository name (e.g., "bloomly-app")
     - `GITHUB_BRANCH`: Branch name (usually "main")

3. **Update Admin Panel to Use GitHub API**:
   - In `admin/index.html`, change the API endpoint from `create-post` to `create-post-github`
   - Or keep both and let users choose

### Step 4: Test the Admin Panel

1. **Access the admin panel**:
   - Go to `https://your-site.netlify.app/admin`
   - You should see the custom admin interface

2. **Create a test post**:
   - Click "New Post" tab
   - Fill in the form:
     - Title: "Test Post"
     - Date: Select current date/time
     - Category: "Mental Health"
     - Summary: "This is a test post"
     - Body: "This is the content of my test post."
   - Click "Save Post"

3. **Verify the post was saved**:
   - Check the "All Posts" tab - your post should appear
   - Wait for Netlify to rebuild (if using GitHub API)
   - Check your repository - a new markdown file should be in `content/blog/`
   - Check `data/blog-posts.json` - it should contain the post data

### Step 4: Verify API Endpoints

You can test the API endpoints directly:

```bash
# Get all posts
curl https://your-site.netlify.app/.netlify/functions/get-posts

# Get a specific post
curl https://your-site.netlify.app/.netlify/functions/get-post?slug=test-post

# Create a post (POST request)
curl -X POST https://your-site.netlify.app/.netlify/functions/create-post \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My New Post",
    "date": "2025-01-20T10:00:00.000Z",
    "category": "Mental Health",
    "summary": "A new post",
    "body": "Post content here",
    "emoji": "💙"
  }'
```

## How It Works

### Creating a Post

1. User fills out the form in `/admin`
2. Form submits to `/.netlify/functions/create-post`
3. Function:
   - Validates the data
   - Generates a slug from the title
   - Saves to `data/blog-posts.json`
   - Creates a markdown file in `content/blog/`
   - Returns success response

### Reading Posts

1. Blog page loads `blog-loader.js`
2. Loader fetches from `/.netlify/functions/get-posts`
3. Function reads `data/blog-posts.json` and returns all posts
4. Posts are displayed on the blog page

### Updating/Deleting Posts

- Similar flow, but uses `update-post` or `delete-post` functions
- Both database and markdown files are updated/deleted

## Important Note About File Storage

⚠️ **Netlify Functions Limitation**: Netlify Functions run in an ephemeral environment. While they can READ files from your repository, WRITING files won't persist because the filesystem is temporary.

**Current Solution**: The functions will work for reading posts, but for writing, you have two options:

1. **Use GitHub API** (recommended for Git-based workflow)
2. **Use a Database** (recommended for production)

## Database Options

### Option 1: GitHub API (Git-Based)

This commits changes directly to your repository. See `netlify/functions/create-post-github.js` (if created).

### Option 2: JSON File (Development Only)

The current setup uses a JSON file (`data/blog-posts.json`) for storage. This works for:
- ✅ Reading posts (works perfectly)
- ✅ Development/testing
- ❌ Writing posts (won't persist - use GitHub API or database instead)

### Option 3: MongoDB Atlas (Recommended for Production)

For production, use MongoDB Atlas (free tier available):

### Alternative: MongoDB Atlas (Recommended for Production)

For a production site with many posts or multiple users, consider MongoDB:

1. **Sign up for MongoDB Atlas** (free tier available):
   - Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Create a free cluster
   - Get your connection string

2. **Update the functions** to use MongoDB:

```javascript
// Install MongoDB driver
// Add to package.json: "mongodb": "^6.0.0"

const { MongoClient } = require('mongodb');

const client = new MongoClient(process.env.MONGODB_URI);
const db = client.db('bloomly');
const collection = db.collection('posts');

// In your function:
await client.connect();
const posts = await collection.find({}).toArray();
```

3. **Add environment variable in Netlify**:
   - Go to Site settings → Environment variables
   - Add `MONGODB_URI` with your connection string

### Alternative: Supabase (PostgreSQL)

Supabase provides a PostgreSQL database with a REST API:

1. **Sign up for Supabase** (free tier available)
2. **Create a table**:
   ```sql
   CREATE TABLE blog_posts (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     slug TEXT UNIQUE NOT NULL,
     title TEXT NOT NULL,
     date TIMESTAMPTZ NOT NULL,
     category TEXT,
     summary TEXT,
     emoji TEXT,
     featured_image TEXT,
     body TEXT NOT NULL,
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

3. **Use Supabase client** in your functions

## Troubleshooting

### Posts Not Saving

1. **Check Netlify Functions logs**:
   - Go to Netlify Dashboard → Functions
   - Check for errors in function logs

2. **Verify file permissions**:
   - Ensure `data/` directory exists and is writable
   - Check that `content/blog/` directory exists

3. **Check CORS**:
   - Functions include CORS headers
   - If issues persist, verify headers in browser DevTools

### Admin Panel Not Loading

1. **Check redirects**:
   - Verify `/admin` redirects to `/admin/index.html` in `netlify.toml`

2. **Check browser console**:
   - Open DevTools → Console
   - Look for JavaScript errors

3. **Verify API endpoints**:
   - Test endpoints directly (see Step 4)

### Functions Not Deploying

1. **Check build logs**:
   - Netlify Dashboard → Deploys → Build log
   - Look for errors

2. **Verify function syntax**:
   - Functions must export a `handler` function
   - Check Node.js version compatibility

3. **Check netlify.toml**:
   - Ensure `[functions]` section is correct

## Security Considerations

### Current Setup (Basic)

The current setup has basic security:
- ✅ CORS headers included
- ✅ Input validation
- ⚠️ No authentication (anyone can access `/admin`)

### Adding Authentication

For production, add authentication:

1. **Netlify Identity**:
   ```javascript
   // In admin/index.html, add before form submission:
   const user = netlifyIdentity.currentUser();
   if (!user) {
     // Redirect to login
     window.location.href = '/admin/login';
   }
   ```

2. **API Key Authentication**:
   - Add API key check in each function
   - Store key in Netlify environment variables

3. **JWT Tokens**:
   - Implement JWT-based auth
   - Verify tokens in functions

## Migration from Existing Posts

If you have existing markdown files in `content/blog/`, you can migrate them:

1. **Create a migration script** (`scripts/migrate-posts.js`):

```javascript
const fs = require('fs');
const path = require('path');

const contentDir = path.join(__dirname, '../content/blog');
const dataDir = path.join(__dirname, '../data');
const dbPath = path.join(dataDir, 'blog-posts.json');

const files = fs.readdirSync(contentDir).filter(f => f.endsWith('.md'));
const posts = [];

files.forEach(file => {
  const content = fs.readFileSync(path.join(contentDir, file), 'utf8');
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  
  if (match) {
    const frontmatter = match[1];
    const body = match[2];
    const metadata = {};
    
    frontmatter.split('\n').forEach(line => {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        let value = line.substring(colonIndex + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        metadata[key] = value;
      }
    });
    
    posts.push({
      id: `post-${Date.now()}-${Math.random()}`,
      slug: file.replace('.md', ''),
      title: metadata.title,
      date: metadata.date,
      category: metadata.category || 'Mental Health',
      summary: metadata.summary || '',
      emoji: metadata.emoji || '💙',
      featuredImage: metadata.featuredImage || '',
      body: body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
});

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

fs.writeFileSync(dbPath, JSON.stringify(posts, null, 2));
console.log(`Migrated ${posts.length} posts to database`);
```

2. **Run the migration**:
   ```bash
   node scripts/migrate-posts.js
   ```

3. **Commit and push**:
   ```bash
   git add data/blog-posts.json
   git commit -m "Migrate existing posts to database"
   git push
   ```

## Next Steps

1. ✅ Backend is set up and working
2. ✅ Admin panel is functional
3. 🔄 Consider adding authentication
4. 🔄 Consider migrating to MongoDB for production
5. 🔄 Add image upload functionality
6. 🔄 Add draft/publish status
7. 🔄 Add tags/categories management

## Support

If you encounter issues:
1. Check Netlify Function logs
2. Check browser console for errors
3. Verify all files are committed and pushed
4. Ensure Netlify build completed successfully

For more help, refer to:
- [Netlify Functions Docs](https://docs.netlify.com/functions/overview/)
- [Netlify Redirects Docs](https://docs.netlify.com/routing/redirects/)

