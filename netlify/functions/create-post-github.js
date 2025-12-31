/**
 * Netlify Function: Create a new blog post using GitHub API
 * POST /api/create-post-github
 * 
 * This version commits files directly to your GitHub repository
 * Requires GITHUB_TOKEN environment variable in Netlify
 */

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
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
    
    if (!data.title || !data.body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Title and body are required' }),
      };
    }

    const githubToken = process.env.GITHUB_TOKEN;
    const repoOwner = process.env.GITHUB_REPO_OWNER || 'Emmanueld14';
    const repoName = process.env.GITHUB_REPO_NAME || 'bloomly-app';
    const branch = process.env.GITHUB_BRANCH || 'main';

    if (!githubToken) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'GitHub token not configured. Please set GITHUB_TOKEN in Netlify environment variables.' 
        }),
      };
    }

    // Use shared config for consistency
    const config = require('./shared/config');
    
    // Generate slug
    const slug = data.slug || config.generateSlug(data.title);

    // Create post object
    const post = {
      id: `post-${Date.now()}`,
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

    // Create markdown content
    const markdownContent = `---
title: "${post.title}"
date: ${post.date}
category: "${post.category}"
summary: "${post.summary.replace(/"/g, '\\"')}"
emoji: "${post.emoji}"
featuredImage: "${post.featuredImage}"
---

${post.body}`;

    // Get current file content (if exists) - use shared config
    const filePath = config.getPostPath(slug);
    let currentSha = null;

    try {
      const getFileResponse = await fetch(
        `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}?ref=${branch}`,
        {
          headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
          },
        }
      );

      if (getFileResponse.ok) {
        const fileData = await getFileResponse.json();
        currentSha = fileData.sha;
      }
    } catch (error) {
      // File doesn't exist, that's okay
    }

    if (currentSha) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ error: 'A post with this slug already exists' }),
      };
    }

    // Commit file to GitHub
    const content = Buffer.from(markdownContent).toString('base64');
    const commitMessage = `Add blog post: ${post.title}`;

    const createFileResponse = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: commitMessage,
          content: content,
          branch: branch,
        }),
      }
    );

    if (!createFileResponse.ok) {
      const error = await createFileResponse.json();
      throw new Error(error.message || 'Failed to create file in GitHub');
    }

    // Also update blog-posts.json (optional - for backward compatibility)
    const dbPath = config.DB_PATH;
    let posts = [];

    try {
      const getDbResponse = await fetch(
        `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${dbPath}?ref=${branch}`,
        {
          headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
          },
        }
      );

      if (getDbResponse.ok) {
        const dbData = await getDbResponse.json();
        const dbContent = Buffer.from(dbData.content, 'base64').toString('utf8');
        posts = JSON.parse(dbContent);
      }
    } catch (error) {
      // File doesn't exist, start with empty array
    }

    posts.push(post);
    const dbContent = Buffer.from(JSON.stringify(posts, null, 2)).toString('base64');

    try {
      const getDbResponse = await fetch(
        `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${dbPath}?ref=${branch}`,
        {
          headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
          },
        }
      );

      let dbSha = null;
      if (getDbResponse.ok) {
        const dbData = await getDbResponse.json();
        dbSha = dbData.sha;
      }

      await fetch(
        `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${dbPath}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: `Update blog posts database: Add ${post.title}`,
            content: dbContent,
            branch: branch,
            sha: dbSha,
          }),
        }
      );
    } catch (error) {
      console.warn('Failed to update blog-posts.json:', error);
      // Continue anyway - markdown file was created
    }

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({ 
        success: true, 
        post,
        message: 'Post created and committed to repository. It will appear after Netlify rebuilds.' 
      }),
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

