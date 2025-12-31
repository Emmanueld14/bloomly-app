/**
 * Netlify Function: Get a single blog post by slug
 * GET /api/get-post?slug=post-slug
 */

const fs = require('fs');
const path = require('path');

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

  try {
    const { slug } = event.queryStringParameters || {};
    
    if (!slug) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Slug parameter is required' }),
      };
    }

    const dbPath = path.join(process.cwd(), 'data', 'blog-posts.json');
    
    if (!fs.existsSync(dbPath)) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Post not found' }),
      };
    }

    const posts = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    const post = posts.find(p => p.slug === slug);

    if (!post) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Post not found' }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(post),
    };
  } catch (error) {
    console.error('Error getting post:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to get post', details: error.message }),
    };
  }
};

