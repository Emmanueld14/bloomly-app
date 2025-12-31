/**
 * Netlify Function: Create a new blog post
 * POST /api/create-post
 */

const fs = require('fs');
const path = require('path');

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const data = JSON.parse(event.body);
    
    // Validate required fields
    if (!data.title || !data.body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Title and body are required' }),
      };
    }

    // Generate slug from title
    const slug = data.slug || data.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Create post object
    const post = {
      id: data.id || `post-${Date.now()}`,
      slug: slug,
      title: data.title,
      date: data.date || new Date().toISOString(),
      category: data.category || 'Mental Health',
      summary: data.summary || '',
      emoji: data.emoji || '💙',
      featuredImage: data.featuredImage || '',
      body: data.body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Ensure data directory exists
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Read existing posts
    const dbPath = path.join(dataDir, 'blog-posts.json');
    let posts = [];
    if (fs.existsSync(dbPath)) {
      const fileContent = fs.readFileSync(dbPath, 'utf8');
      posts = JSON.parse(fileContent);
    }

    // Check if slug already exists
    const existingPost = posts.find(p => p.slug === slug);
    if (existingPost) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ error: 'A post with this slug already exists' }),
      };
    }

    // Add new post
    posts.push(post);

    // Write back to file
    fs.writeFileSync(dbPath, JSON.stringify(posts, null, 2), 'utf8');

    // Also create markdown file for compatibility with existing loader
    const contentDir = path.join(process.cwd(), 'content', 'blog');
    if (!fs.existsSync(contentDir)) {
      fs.mkdirSync(contentDir, { recursive: true });
    }

    const markdownPath = path.join(contentDir, `${slug}.md`);
    const markdownContent = `---
title: "${post.title}"
date: ${post.date}
category: "${post.category}"
summary: "${post.summary.replace(/"/g, '\\"')}"
emoji: "${post.emoji}"
featuredImage: "${post.featuredImage}"
---

${post.body}`;

    fs.writeFileSync(markdownPath, markdownContent, 'utf8');

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({ success: true, post }),
    };
  } catch (error) {
    console.error('Error creating post:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to create post', details: error.message }),
    };
  }
};

