# Netlify CMS Setup Guide for Bloomly

## Overview

This website is configured with Netlify CMS for easy content management. Blog posts are stored as Markdown files in `/content/blog/` and are dynamically loaded on the blog page.

## Setup Instructions

### 1. Deploy to Netlify

1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket)
2. Connect your repository to Netlify
3. Deploy the site

### 2. Enable Netlify Identity

1. Go to your Netlify site dashboard
2. Navigate to **Identity** → **Enable Identity**
3. Enable **Git Gateway** (this allows CMS users to commit to your repo)
4. Configure registration preferences (invite-only recommended)

### 3. Invite Users

1. Go to **Identity** → **Invite users**
2. Enter the email address of the content editor
3. They will receive an invitation email
4. They can then log in at `yoursite.com/admin`

### 4. Access the CMS

- Navigate to `yoursite.com/admin`
- Log in with your Netlify Identity credentials
- Start creating and editing blog posts!

## File Structure

```
├── static/
│   └── admin/
│       ├── index.html          # CMS admin interface
│       ├── config.yml          # CMS configuration
│       └── preview-templates/  # Preview templates
├── content/
│   └── blog/                   # Blog post markdown files
│       ├── self-care-practices.md
│       ├── supporting-friends.md
│       └── ...
├── public/
│   └── uploads/                # Uploaded images
├── blog.html                   # Blog listing page
├── blog-loader.js              # Loads blog posts dynamically
└── blog-post-loader.js         # Loads individual posts
```

## Creating Blog Posts

### Via CMS (Recommended)

1. Log in at `/admin`
2. Click **New Blog**
3. Fill in:
   - **Title**: Post title
   - **Publish Date**: When to publish
   - **Category**: e.g., "Self-Care", "Mental Health"
   - **Summary**: Short description (shown on blog listing)
   - **Featured Image**: Optional image
   - **Body**: Full post content in Markdown
   - **Emoji Icon**: Emoji to display on blog card
4. Click **Publish**

### Manually

1. Create a new `.md` file in `/content/blog/`
2. Use this frontmatter format:

```markdown
---
title: "Your Post Title"
date: 2025-01-20T10:00:00.000Z
category: "Category Name"
summary: "Short description here"
emoji: "💙"
featuredImage: ""
---

Your post content in Markdown...
```

3. Commit and push to your repository

## How It Works

1. **Blog Listing Page** (`blog.html`):
   - Uses `blog-loader.js` to fetch all markdown files from `/content/blog/`
   - Displays them as glassmorphic cards with animations
   - Links to individual post pages

2. **Blog Post Pages** (`blog/[slug].html`):
   - Each post has its own HTML file
   - Loads the corresponding markdown file
   - Renders with the site's styling

3. **CMS Admin** (`/admin`):
   - Provides a user-friendly interface
   - Allows editing markdown files without coding
   - Shows live preview of how posts will look

## Features

- ✅ Glassmorphic card design
- ✅ Smooth fade-in animations
- ✅ Responsive design
- ✅ SEO-friendly URLs
- ✅ Markdown support
- ✅ Image uploads
- ✅ Live preview in CMS

## Troubleshooting

### Posts not showing up
- Check that markdown files are in `/content/blog/`
- Verify frontmatter format is correct
- Check browser console for errors

### CMS login not working
- Ensure Netlify Identity is enabled
- Verify Git Gateway is enabled
- Check that you've accepted the invitation email

### Images not displaying
- Ensure images are uploaded via CMS (goes to `/public/uploads/`)
- Check image paths in markdown
- Verify `public_folder` setting in `config.yml`

## Support

For issues or questions, refer to:
- [Netlify CMS Documentation](https://www.netlifycms.org/docs/)
- [Netlify Identity Documentation](https://docs.netlify.com/visitor-access/identity/)

