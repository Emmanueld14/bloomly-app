/**
 * Shared configuration constants for blog functions
 * Single source of truth for blog directory paths
 */

module.exports = {
  // Blog post directory and file extension
  BLOG_POSTS_DIR: 'content/blog',
  BLOG_POSTS_EXT: '.md',
  
  // Database file path
  DB_PATH: 'data/blog-posts.json',
  
  // Get full file path for a slug
  getPostPath: (slug) => {
    return `${module.exports.BLOG_POSTS_DIR}/${slug}${module.exports.BLOG_POSTS_EXT}`;
  },
  
  // Get GitHub repo config from environment
  getGitHubConfig: () => {
    return {
      token: process.env.GITHUB_TOKEN,
      repoOwner: process.env.GITHUB_REPO_OWNER || 'Emmanueld14',
      repoName: process.env.GITHUB_REPO_NAME || 'bloomly-app',
      branch: process.env.GITHUB_BRANCH || 'main',
    };
  },
  
  // Generate slug from title
  generateSlug: (title) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  },
  
  // Parse markdown frontmatter and body
  parseMarkdown: (content) => {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);
    
    if (!match) return null;
    
    const frontmatter = match[1];
    const body = match[2];
    const metadata = {};
    
    frontmatter.split('\n').forEach(line => {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        let value = line.substring(colonIndex + 1).trim();
        // Remove quotes
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        metadata[key] = value;
      }
    });
    
    return {
      metadata,
      body
    };
  }
};

