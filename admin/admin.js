/**
 * Bloomly Blog Admin - GitHub OAuth Admin Interface
 * Manages blog posts via GitHub API
 */

(function() {
    'use strict';
    
    let githubToken = null;
    let githubUser = null;
    const config = typeof GITHUB_CONFIG !== 'undefined' ? GITHUB_CONFIG : {};
    
    // Initialize
    function init() {
        // Show admin content directly (no login needed)
        showAdminContent();
        loadPosts();
    }
    
    // Show admin content
    function showAdminContent() {
        document.getElementById('adminContent').classList.add('active');
    }
    
    // Load blog posts (public API, no auth needed)
    async function loadPosts() {
        const postsList = document.getElementById('postsList');
        postsList.innerHTML = '<div class="loading">Loading posts...</div>';
        
        try {
            const repoOwner = config.repoOwner || 'Emmanueld14';
            const repoName = config.repoName || 'bloomly-app';
            const repoBranch = config.repoBranch || 'main';
            const apiBase = config.apiBase || 'https://api.github.com';
            
            // Get list of files in content/blog directory (public repo, no auth needed)
            const response = await fetch(
                `${apiBase}/repos/${repoOwner}/${repoName}/contents/content/blog`
            );
            
            if (!response.ok) {
                throw new Error('Failed to load posts: ' + response.statusText);
            }
            
            const files = await response.json();
            const markdownFiles = files.filter(file => file.name.endsWith('.md'));
            
            // Load each post's content to get metadata
            const posts = await Promise.all(
                markdownFiles.map(async (file) => {
                    try {
                        const fileResponse = await fetch(file.download_url);
                        const content = await fileResponse.text();
                        const frontmatter = parseFrontmatter(content);
                        return {
                            ...file,
                            ...frontmatter,
                            slug: file.name.replace('.md', '')
                        };
                    } catch (error) {
                        console.error('Error loading post:', file.name, error);
                        return {
                            ...file,
                            title: file.name.replace('.md', ''),
                            date: new Date().toISOString(),
                            slug: file.name.replace('.md', '')
                        };
                    }
                })
            );
            
            // Sort by date (newest first)
            posts.sort((a, b) => {
                const dateA = new Date(a.date || 0);
                const dateB = new Date(b.date || 0);
                return dateB - dateA;
            });
            
            // Render posts
            if (posts.length === 0) {
                postsList.innerHTML = '<p style="text-align: center; color: #666;">No blog posts found.</p>';
            } else {
                postsList.innerHTML = posts.map(post => `
                    <div class="post-item">
                        <div class="post-info">
                            <h3>${post.title || post.slug}</h3>
                            <p>${formatDate(post.date)} • ${post.category || 'Uncategorized'}</p>
                        </div>
                        <div class="post-actions">
                            <button class="btn-edit" onclick="editPost('${post.slug}')">Edit on GitHub</button>
                            <button class="btn-delete" onclick="deletePost('${post.slug}', '${post.name}')">Delete on GitHub</button>
                        </div>
                    </div>
                `).join('');
            }
        } catch (error) {
            console.error('Error loading posts:', error);
            showError('Failed to load posts: ' + error.message);
            postsList.innerHTML = '<p style="text-align: center; color: #ff4444;">Error loading posts. Please try again.</p>';
        }
    }
    
    // Parse frontmatter from markdown
    function parseFrontmatter(content) {
        const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
        const match = content.match(frontmatterRegex);
        
        if (!match) {
            return { title: '', date: new Date().toISOString(), category: '', summary: '' };
        }
        
        const frontmatter = match[1];
        const metadata = {};
        
        frontmatter.split('\n').forEach(line => {
            const colonIndex = line.indexOf(':');
            if (colonIndex > 0) {
                const key = line.substring(0, colonIndex).trim();
                let value = line.substring(colonIndex + 1).trim();
                if ((value.startsWith('"') && value.endsWith('"')) || 
                    (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
                }
                metadata[key] = value;
            }
        });
        
        return metadata;
    }
    
    // Format date
    function formatDate(dateString) {
        if (!dateString) return 'No date';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }
    
    // Show error message
    function showError(message) {
        const errorDiv = document.getElementById('errorMessage');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }
    
    // Edit post (opens GitHub editor in new tab)
    window.editPost = function(slug, isNew = false) {
        const repoOwner = config.repoOwner || 'Emmanueld14';
        const repoName = config.repoName || 'bloomly-app';
        const fileName = slug + '.md';
        const filePath = `content/blog/${fileName}`;
        
        if (isNew) {
            // For new posts, use GitHub's new file interface
            const newFileUrl = `https://github.com/${repoOwner}/${repoName}/new/${config.repoBranch || 'main'}/content/blog?filename=${fileName}`;
            window.open(newFileUrl, '_blank');
        } else {
            // For existing posts, open GitHub's editor
            const githubUrl = `https://github.com/${repoOwner}/${repoName}/edit/${config.repoBranch || 'main'}/${filePath}`;
            window.open(githubUrl, '_blank');
        }
    };
    
    // Delete post (opens GitHub delete interface)
    window.deletePost = function(slug, fileName) {
        const repoOwner = config.repoOwner || 'Emmanueld14';
        const repoName = config.repoName || 'bloomly-app';
        const filePath = `content/blog/${fileName}`;
        
        // Open GitHub's delete interface
        const deleteUrl = `https://github.com/${repoOwner}/${repoName}/delete/${config.repoBranch || 'main'}/${filePath}`;
        if (confirm(`Delete "${slug}"? This will open GitHub where you can confirm the deletion.`)) {
            window.open(deleteUrl, '_blank');
        }
    };
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

