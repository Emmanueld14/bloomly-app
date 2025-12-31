/**
 * Netlify Function: Update an existing blog post
 * PUT /api/update-post
 */

const fs = require('fs');
const path = require('path');

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'PUT, OPTIONS',
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

  if (event.httpMethod !== 'PUT') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const data = JSON.parse(event.body);
    
    if (!data.id && !data.slug) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Post ID or slug is required' }),
      };
    }

    const dbPath = path.join(process.cwd(), 'data', 'blog-posts.json');
    
    if (!fs.existsSync(dbPath)) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'No posts found' }),
      };
    }

    let posts = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    
    // Find post by ID or slug
    const postIndex = posts.findIndex(p => 
      (data.id && p.id === data.id) || (data.slug && p.slug === data.slug)
    );

    if (postIndex === -1) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Post not found' }),
      };
    }

    // Update post
    const existingPost = posts[postIndex];
    const updatedPost = {
      ...existingPost,
      ...data,
      updatedAt: new Date().toISOString(),
    };

    // Update slug if title changed
    if (data.title && data.title !== existingPost.title) {
      updatedPost.slug = data.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }

    posts[postIndex] = updatedPost;

    // Write back to file
    fs.writeFileSync(dbPath, JSON.stringify(posts, null, 2), 'utf8');

    // Update markdown file
    const slug = updatedPost.slug;
    const contentDir = path.join(process.cwd(), 'content', 'blog');
    const markdownPath = path.join(contentDir, `${slug}.md`);
    
    const markdownContent = `---
title: "${updatedPost.title}"
date: ${updatedPost.date}
category: "${updatedPost.category}"
summary: "${updatedPost.summary.replace(/"/g, '\\"')}"
emoji: "${updatedPost.emoji}"
featuredImage: "${updatedPost.featuredImage}"
---

${updatedPost.body}`;

    fs.writeFileSync(markdownPath, markdownContent, 'utf8');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, post: updatedPost }),
    };
  } catch (error) {
    console.error('Error updating post:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to update post', details: error.message }),
    };
  }
};

