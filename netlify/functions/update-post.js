/**
 * Netlify Function: Update an existing blog post
 * PUT /api/update-post
 * 
 * Updates posts via GitHub API (same source as writes)
 */

const config = require('./shared/config');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'PUT, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
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
    let slug = data.slug;
    
    // If we only have ID, fetch the post to get the slug
    if (!slug && data.id) {
      try {
        // List all posts to find the one with matching ID
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
              const fileResponse = await fetch(file.download_url);
              if (fileResponse.ok) {
                const markdown = await fileResponse.text();
                const parsed = config.parseMarkdown(markdown);
                if (parsed) {
                  const fileSlug = file.name.replace(config.BLOG_POSTS_EXT, '');
                  if (`post-${fileSlug}` === data.id || fileSlug === data.slug) {
                    slug = fileSlug;
                    break;
                  }
                }
              }
            }
          }
        }
      } catch (error) {
        console.warn('Failed to find post by ID:', error);
      }
    }

    if (!slug) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Post not found' }),
      };
    }

    // Get existing file to get SHA
    const filePath = config.getPostPath(slug);
    let currentSha = null;
    let existingPost = null;

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
        currentSha = fileData.sha;
        const markdown = Buffer.from(fileData.content, 'base64').toString('utf8');
        const parsed = config.parseMarkdown(markdown);
        if (parsed) {
          existingPost = {
            title: parsed.metadata.title || '',
            date: parsed.metadata.date || new Date().toISOString(),
            category: parsed.metadata.category || 'Mental Health',
            summary: parsed.metadata.summary || '',
            emoji: parsed.metadata.emoji || '💙',
            featuredImage: parsed.metadata.featuredImage || '',
            body: parsed.body,
          };
        }
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

    // Merge updates
    const updatedPost = {
      ...existingPost,
      ...data,
      updatedAt: new Date().toISOString(),
    };

    // Update slug if title changed
    let newSlug = slug;
    if (data.title && data.title !== existingPost.title) {
      newSlug = config.generateSlug(data.title);
    }

    // Create markdown content
    const markdownContent = `---
title: "${updatedPost.title}"
date: ${updatedPost.date}
category: "${updatedPost.category}"
summary: "${updatedPost.summary.replace(/"/g, '\\"')}"
emoji: "${updatedPost.emoji}"
featuredImage: "${updatedPost.featuredImage}"
---

${updatedPost.body}`;

    // Update file in GitHub
    const content = Buffer.from(markdownContent).toString('base64');
    const commitMessage = `Update blog post: ${updatedPost.title}`;

    // If slug changed, create new file and delete old one
    if (newSlug !== slug) {
      const newFilePath = config.getPostPath(newSlug);
      
      // Create new file
      await fetch(
        `https://api.github.com/repos/${github.repoOwner}/${github.repoName}/contents/${newFilePath}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `token ${github.token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: commitMessage,
            content: content,
            branch: github.branch,
          }),
        }
      );

      // Delete old file
      await fetch(
        `https://api.github.com/repos/${github.repoOwner}/${github.repoName}/contents/${filePath}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `token ${github.token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: `Rename blog post: ${slug} → ${newSlug}`,
            sha: currentSha,
            branch: github.branch,
          }),
        }
      );

      updatedPost.slug = newSlug;
    } else {
      // Update existing file
      const updateResponse = await fetch(
        `https://api.github.com/repos/${github.repoOwner}/${github.repoName}/contents/${filePath}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `token ${github.token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: commitMessage,
            content: content,
            sha: currentSha,
            branch: github.branch,
          }),
        }
      );

      if (!updateResponse.ok) {
        const error = await updateResponse.json();
        throw new Error(error.message || 'Failed to update file in GitHub');
      }
    }

    updatedPost.id = `post-${newSlug}`;
    updatedPost.slug = newSlug;

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
