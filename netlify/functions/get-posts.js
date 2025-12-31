/**
 * Netlify Function: Get all blog posts
 * GET /api/get-posts
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
    // Path to database file
    const dbPath = path.join(process.cwd(), 'data', 'blog-posts.json');
    
    // Read database file
    let posts = [];
    if (fs.existsSync(dbPath)) {
      const fileContent = fs.readFileSync(dbPath, 'utf8');
      posts = JSON.parse(fileContent);
    }

    // Sort by date (newest first)
    posts.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB - dateA;
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(posts),
    };
  } catch (error) {
    console.error('Error getting posts:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to get posts', details: error.message }),
    };
  }
};

