/**
 * Netlify Function: Delete a blog post
 * DELETE /api/delete-post
 * 
 * Deletes posts via GitHub API (same source as writes)
 */

const config = require('./shared/config');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
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

    const github = config.getGitHubConfig();
    
    if (!github.token) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'GitHub token not configured. Please set GITHUB_TOKEN in Netlify environment variables.' 
        }),
      };
    }

    // Determine slug
    let targetSlug = slug;
    
    // If we only have ID, find the slug
    if (!targetSlug && id) {
      try {
        const listResponse = await fetch(
          `https://api.github.com/repos/${github.repoOwner}/${github.repoName}/contents/${config.BLOG_POSTS_DIR}?ref=${github.branch}`,
          {
            headers: {
              'Authorization': `token ${github.token}`,
              'Accept': 'application/vnd.github.v3+json',
            },
          }
        );

        if (listResponse.ok) {
          const files = await listResponse.json();
          for (const file of files) {
            if (file.type === 'file' && file.name.endsWith(config.BLOG_POSTS_EXT)) {
              const fileSlug = file.name.replace(config.BLOG_POSTS_EXT, '');
              if (`post-${fileSlug}` === id || fileSlug === slug) {
                targetSlug = fileSlug;
                break;
              }
            }
          }
        }
      } catch (error) {
        console.warn('Failed to find post by ID:', error);
      }
    }

    if (!targetSlug) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Post not found' }),
      };
    }

    // Get file SHA for deletion
    const filePath = config.getPostPath(targetSlug);
    let fileSha = null;

    try {
      const getFileResponse = await fetch(
        `https://api.github.com/repos/${github.repoOwner}/${github.repoName}/contents/${filePath}?ref=${github.branch}`,
        {
          headers: {
            'Authorization': `token ${github.token}`,
            'Accept': 'application/vnd.github.v3+json',
          },
        }
      );

      if (getFileResponse.ok) {
        const fileData = await getFileResponse.json();
        fileSha = fileData.sha;
      } else {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Post not found' }),
        };
      }
    } catch (error) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Post not found' }),
      };
    }

    // Delete file from GitHub
    const deleteResponse = await fetch(
      `https://api.github.com/repos/${github.repoOwner}/${github.repoName}/contents/${filePath}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `token ${github.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Delete blog post: ${targetSlug}`,
          sha: fileSha,
          branch: github.branch,
        }),
      }
    );

    if (!deleteResponse.ok) {
      const error = await deleteResponse.json();
      throw new Error(error.message || 'Failed to delete file from GitHub');
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
