/**
 * Netlify Function: Get a single blog post by slug
 * GET /api/get-post?slug=post-slug
 * 
 * Reads from GitHub API (same source as writes)
 */

const config = require('./shared/config');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
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

    const github = config.getGitHubConfig();
    
    // If GitHub token is available, read from GitHub API
    if (github.token) {
      try {
        const filePath = config.getPostPath(slug);
        const fileResponse = await fetch(
          `https://api.github.com/repos/${github.repoOwner}/${github.repoName}/contents/${filePath}?ref=${github.branch}`,
          {
            headers: {
              'Authorization': `token ${github.token}`,
              'Accept': 'application/vnd.github.v3+json',
            },
          }
        );

        if (fileResponse.ok) {
          const fileData = await fileResponse.json();
          const markdown = Buffer.from(fileData.content, 'base64').toString('utf8');
          const parsed = config.parseMarkdown(markdown);
          
          if (parsed) {
            const post = {
              id: `post-${slug}`,
              slug: slug,
              title: parsed.metadata.title || '',
              date: parsed.metadata.date || new Date().toISOString(),
              category: parsed.metadata.category || 'Mental Health',
              summary: parsed.metadata.summary || '',
              emoji: parsed.metadata.emoji || '💙',
              featuredImage: parsed.metadata.featuredImage || '',
              body: parsed.body,
            };

            return {
              statusCode: 200,
              headers,
              body: JSON.stringify(post),
            };
          }
        }
      } catch (error) {
        console.warn('GitHub API failed, falling back to local files:', error);
      }
    }

    // Fallback: Try to read from local filesystem
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(process.cwd(), config.getPostPath(slug));
    
    if (fs.existsSync(filePath)) {
      const markdown = fs.readFileSync(filePath, 'utf8');
      const parsed = config.parseMarkdown(markdown);
      
      if (parsed) {
        const post = {
          id: `post-${slug}`,
          slug: slug,
          title: parsed.metadata.title || '',
          date: parsed.metadata.date || new Date().toISOString(),
          category: parsed.metadata.category || 'Mental Health',
          summary: parsed.metadata.summary || '',
          emoji: parsed.metadata.emoji || '💙',
          featuredImage: parsed.metadata.featuredImage || '',
          body: parsed.body,
        };

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(post),
        };
      }
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Post not found' }),
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
