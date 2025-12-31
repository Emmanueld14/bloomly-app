/**
 * Netlify Function: Get all blog posts
 * GET /api/get-posts
 * 
 * Reads posts from GitHub API (same source as writes)
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
    const github = config.getGitHubConfig();
    
    // If GitHub token is available, read from GitHub API
    if (github.token) {
      try {
        // List all files in content/blog directory via GitHub API
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
          const posts = [];

          // Filter for .md files and fetch each one
          for (const file of files) {
            if (file.type === 'file' && file.name.endsWith(config.BLOG_POSTS_EXT)) {
              try {
                const fileResponse = await fetch(file.download_url);
                if (fileResponse.ok) {
                  const markdown = await fileResponse.text();
                  const parsed = config.parseMarkdown(markdown);
                  
                  if (parsed) {
                    const slug = file.name.replace(config.BLOG_POSTS_EXT, '');
                    posts.push({
                      id: `post-${slug}`,
                      slug: slug,
                      title: parsed.metadata.title || '',
                      date: parsed.metadata.date || new Date().toISOString(),
                      category: parsed.metadata.category || 'Mental Health',
                      summary: parsed.metadata.summary || '',
                      emoji: parsed.metadata.emoji || '💙',
                      featuredImage: parsed.metadata.featuredImage || '',
                      body: parsed.body,
                    });
                  }
                }
              } catch (error) {
                console.warn(`Failed to fetch ${file.name}:`, error);
              }
            }
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
        }
      } catch (error) {
        console.warn('GitHub API failed, falling back to local files:', error);
      }
    }

    // Fallback: Try to read from local filesystem (for development)
    const fs = require('fs');
    const path = require('path');
    const blogDir = path.join(process.cwd(), config.BLOG_POSTS_DIR);
    
    if (fs.existsSync(blogDir)) {
      const files = fs.readdirSync(blogDir).filter(f => f.endsWith(config.BLOG_POSTS_EXT));
      const posts = [];

      for (const filename of files) {
        try {
          const filePath = path.join(blogDir, filename);
          const markdown = fs.readFileSync(filePath, 'utf8');
          const parsed = config.parseMarkdown(markdown);
          
          if (parsed) {
            const slug = filename.replace(config.BLOG_POSTS_EXT, '');
            posts.push({
              id: `post-${slug}`,
              slug: slug,
              title: parsed.metadata.title || '',
              date: parsed.metadata.date || new Date().toISOString(),
              category: parsed.metadata.category || 'Mental Health',
              summary: parsed.metadata.summary || '',
              emoji: parsed.metadata.emoji || '💙',
              featuredImage: parsed.metadata.featuredImage || '',
              body: parsed.body,
            });
          }
        } catch (error) {
          console.warn(`Failed to read ${filename}:`, error);
        }
      }

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
    }

    // No posts found
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify([]),
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
