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
        // Check if user is logged in
        githubToken = sessionStorage.getItem('github_token');
        const userStr = sessionStorage.getItem('github_user');
        
        if (githubToken && userStr) {
            githubUser = JSON.parse(userStr);
            showAdminContent();
            loadPosts();
        } else {
            showLogin();
        }
        
        // Event listeners
        document.getElementById('githubLoginBtn').addEventListener('click', handleLogin);
        document.getElementById('logoutBtn').addEventListener('click', handleLogout);
        document.getElementById('addPostBtn').addEventListener('click', handleAddPost);
    }
    
    // Show login screen
    function showLogin() {
        document.getElementById('loginSection').style.display = 'block';
        document.getElementById('adminContent').classList.remove('active');
    }
    
    // Show admin content
    function showAdminContent() {
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('adminContent').classList.add('active');
        
        // Update user info
        if (githubUser) {
            document.getElementById('userAvatar').src = githubUser.avatar_url;
            document.getElementById('userName').textContent = githubUser.name || githubUser.login;
            document.getElementById('userEmail').textContent = githubUser.email || 'No email';
        }
    }
    
    // Handle GitHub login
    function handleLogin() {
        const clientId = config.clientId;
        const redirectUri = config.redirectUri || window.location.origin + '/admin/callback.html';
        
        if (!clientId || clientId === 'YOUR_GITHUB_CLIENT_ID_HERE') {
            showError('Please configure GitHub OAuth credentials in admin/config.js');
            return;
        }
        
        // Redirect to GitHub OAuth
        const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=repo`;
        window.location.href = authUrl;
    }
    
    // Handle logout
    function handleLogout() {
        sessionStorage.removeItem('github_token');
        sessionStorage.removeItem('github_user');
        showLogin();
    }
    
    // Load blog posts
    async function loadPosts() {
        const postsList = document.getElementById('postsList');
        postsList.innerHTML = '<div class="loading">Loading posts...</div>';
        
        try {
            const repoOwner = config.repoOwner || 'Emmanueld14';
            const repoName = config.repoName || 'bloomly-app';
            const repoBranch = config.repoBranch || 'main';
            const apiBase = config.apiBase || 'https://api.github.com';
            
            // Get list of files in content/blog directory
            const response = await fetch(
                `${apiBase}/repos/${repoOwner}/${repoName}/contents/content/blog`,
                {
                    headers: {
                        'Authorization': 'token ' + githubToken,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
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
                            <button class="btn-edit" onclick="editPost('${post.slug}')">Edit</button>
                            <button class="btn-delete" onclick="deletePost('${post.slug}', '${post.name}')">Delete</button>
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
    
    // Handle add post
    function handleAddPost() {
        const slug = prompt('Enter post slug (e.g., "my-new-post"):');
        if (!slug) return;
        
        editPost(slug, true);
    }
    
    // Edit post (opens in new window/tab for now - can be enhanced with modal)
    window.editPost = function(slug, isNew = false) {
        const repoOwner = config.repoOwner || 'Emmanueld14';
        const repoName = config.repoName || 'bloomly-app';
        const fileName = slug + '.md';
        const filePath = `content/blog/${fileName}`;
        
        // Open GitHub editor in new tab
        const githubUrl = `https://github.com/${repoOwner}/${repoName}/edit/${config.repoBranch || 'main'}/${filePath}`;
        
        if (isNew) {
            // For new posts, use GitHub's new file interface
            const newFileUrl = `https://github.com/${repoOwner}/${repoName}/new/${config.repoBranch || 'main'}/content/blog?filename=${fileName}`;
            window.open(newFileUrl, '_blank');
        } else {
            window.open(githubUrl, '_blank');
        }
    };
    
    // Delete post
    window.deletePost = async function(slug, fileName) {
        if (!confirm(`Are you sure you want to delete "${slug}"? This action cannot be undone.`)) {
            return;
        }
        
        try {
            const repoOwner = config.repoOwner || 'Emmanueld14';
            const repoName = config.repoName || 'bloomly-app';
            const filePath = `content/blog/${fileName}`;
            
            // First, get the file to get its SHA
            const getFileResponse = await fetch(
                `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`,
                {
                    headers: {
                        'Authorization': 'token ' + githubToken,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );
            
            if (!getFileResponse.ok) {
                throw new Error('Failed to get file: ' + getFileResponse.statusText);
            }
            
            const fileData = await getFileResponse.json();
            
            // Delete the file
            const deleteResponse = await fetch(
                `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`,
                {
                    method: 'DELETE',
                    headers: {
                        'Authorization': 'token ' + githubToken,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message: `Delete blog post: ${slug}`,
                        sha: fileData.sha,
                        branch: config.repoBranch || 'main'
                    })
                }
            );
            
            if (!deleteResponse.ok) {
                throw new Error('Failed to delete file: ' + deleteResponse.statusText);
            }
            
            alert('Post deleted successfully! The site will update automatically.');
            loadPosts(); // Reload posts list
        } catch (error) {
            console.error('Error deleting post:', error);
            showError('Failed to delete post: ' + error.message);
        }
    };
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

