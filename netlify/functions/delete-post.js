/**
 * Netlify Function: Delete a blog post
 * DELETE /api/delete-post
 */

const fs = require('fs');
const path = require('path');

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
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

  if (event.httpMethod !== 'DELETE') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { id, slug } = JSON.parse(event.body || '{}');
    
    if (!id && !slug) {
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
      (id && p.id === id) || (slug && p.slug === slug)
    );

    if (postIndex === -1) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Post not found' }),
      };
    }

    const deletedPost = posts[postIndex];
    
    // Remove post from array
    posts.splice(postIndex, 1);

    // Write back to file
    fs.writeFileSync(dbPath, JSON.stringify(posts, null, 2), 'utf8');

    // Delete markdown file
    const contentDir = path.join(process.cwd(), 'content', 'blog');
    const markdownPath = path.join(contentDir, `${deletedPost.slug}.md`);
    if (fs.existsSync(markdownPath)) {
      fs.unlinkSync(markdownPath);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: 'Post deleted successfully' }),
    };
  } catch (error) {
    console.error('Error deleting post:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to delete post', details: error.message }),
    };
  }
};

