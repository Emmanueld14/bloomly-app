/**
 * Bloomly Blog Admin - Form-based Admin Interface
 * Manages blog posts via GitHub API using Personal Access Token
 */

(function() {
    'use strict';
    
    let githubToken = null;
    let githubUser = null;
    const config = typeof GITHUB_CONFIG !== 'undefined' ? GITHUB_CONFIG : {};
    
    // Initialize
    function init() {
        // Check if user has saved token
        githubToken = localStorage.getItem('github_token');
        
        if (githubToken) {
            verifyToken();
        } else {
            showAuth();
        }
        
        // Event listeners
        document.getElementById('saveTokenBtn').addEventListener('click', handleSaveToken);
        document.getElementById('logoutBtn').addEventListener('click', handleLogout);
        document.getElementById('addPostBtn').addEventListener('click', handleAddPost);
        document.getElementById('closeModalBtn').addEventListener('click', closeModal);
        document.getElementById('cancelBtn').addEventListener('click', closeModal);
        document.getElementById('postForm').addEventListener('submit', handleSavePost);
        
        // Close modal on outside click
        document.getElementById('postModal').addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal();
            }
        });
    }
    
    // Show auth section
    function showAuth() {
        document.getElementById('authSection').style.display = 'block';
        document.getElementById('adminContent').classList.remove('active');
    }
    
    // Verify token and load user info
    async function verifyToken() {
        try {
            const response = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': 'token ' + githubToken,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (!response.ok) {
                throw new Error('Invalid token');
            }
            
            githubUser = await response.json();
            showAdminContent();
            loadPosts();
        } catch (error) {
            showError('Invalid token. Please enter a valid GitHub Personal Access Token.');
            localStorage.removeItem('github_token');
            showAuth();
        }
    }
    
    // Show admin content
    function showAdminContent() {
        document.getElementById('authSection').style.display = 'none';
        document.getElementById('adminContent').classList.add('active');
        
        // Update user info
        if (githubUser) {
            document.getElementById('userAvatar').src = githubUser.avatar_url;
            document.getElementById('userName').textContent = githubUser.name || githubUser.login;
            document.getElementById('userEmail').textContent = githubUser.email || 'No email';
        }
    }
    
    // Handle save token
    function handleSaveToken() {
        const token = document.getElementById('githubToken').value.trim();
        
        if (!token) {
            showError('Please enter a GitHub Personal Access Token');
            return;
        }
        
        if (!token.startsWith('ghp_')) {
            showError('Invalid token format. GitHub tokens start with "ghp_"');
            return;
        }
        
        githubToken = token;
        localStorage.setItem('github_token', token);
        verifyToken();
    }
    
    // Handle logout
    function handleLogout() {
        localStorage.removeItem('github_token');
        githubToken = null;
        githubUser = null;
        showAuth();
    }
    
    // Load blog posts
    async function loadPosts() {
        const postsList = document.getElementById('postsList');
        postsList.innerHTML = '<div class="loading">Loading posts...</div>';
        
        try {
            const repoOwner = config.repoOwner || 'Emmanueld14';
            const repoName = config.repoName || 'bloomly-app';
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
                            slug: file.name.replace('.md', ''),
                            rawContent: content
                        };
                    } catch (error) {
                        console.error('Error loading post:', file.name, error);
                        return {
                            ...file,
                            title: file.name.replace('.md', ''),
                            date: new Date().toISOString(),
                            slug: file.name.replace('.md', ''),
                            rawContent: ''
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
                            <button class="btn-edit" onclick="editPost('${post.slug}', '${post.name}', ${JSON.stringify(post).replace(/"/g, '&quot;')})">Edit</button>
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
            return { title: '', date: new Date().toISOString(), category: '', summary: '', emoji: '', content: content };
        }
        
        const frontmatter = match[1];
        const body = match[2];
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
        
        return {
            ...metadata,
            content: body
        };
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
    
    // Show success message
    function showSuccess(message) {
        const successDiv = document.getElementById('successMessage');
        successDiv.textContent = message;
        successDiv.style.display = 'block';
        setTimeout(() => {
            successDiv.style.display = 'none';
        }, 5000);
    }
    
    // Handle add post
    function handleAddPost() {
        document.getElementById('modalTitle').textContent = 'Add New Post';
        document.getElementById('isNewPost').value = 'true';
        document.getElementById('postSlug').value = '';
        document.getElementById('postFileName').value = '';
        document.getElementById('postTitle').value = '';
        document.getElementById('postDate').value = new Date().toISOString().slice(0, 16);
        document.getElementById('postCategory').value = 'Mental Health';
        document.getElementById('postSummary').value = '';
        document.getElementById('postEmoji').value = '💙';
        document.getElementById('postContent').value = '';
        document.getElementById('postModal').classList.add('active');
    }
    
    // Edit post
    window.editPost = function(slug, fileName, postData) {
        try {
            const post = typeof postData === 'string' ? JSON.parse(postData.replace(/&quot;/g, '"')) : postData;
            
            document.getElementById('modalTitle').textContent = 'Edit Post';
            document.getElementById('isNewPost').value = 'false';
            document.getElementById('postSlug').value = slug;
            document.getElementById('postFileName').value = fileName;
            document.getElementById('postTitle').value = post.title || '';
            
            // Format date for datetime-local input
            const postDate = post.date ? new Date(post.date).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16);
            document.getElementById('postDate').value = postDate;
            
            document.getElementById('postCategory').value = post.category || 'Mental Health';
            document.getElementById('postSummary').value = post.summary || '';
            document.getElementById('postEmoji').value = post.emoji || '💙';
            document.getElementById('postContent').value = post.content || '';
            
            document.getElementById('postModal').classList.add('active');
        } catch (error) {
            console.error('Error editing post:', error);
            showError('Failed to load post data');
        }
    };
    
    // Close modal
    function closeModal() {
        document.getElementById('postModal').classList.remove('active');
    }
    
    // Handle save post
    async function handleSavePost(e) {
        e.preventDefault();
        
        const saveBtn = document.getElementById('savePostBtn');
        const originalText = saveBtn.textContent;
        saveBtn.textContent = 'Saving...';
        saveBtn.disabled = true;
        
        try {
            const formData = new FormData(e.target);
            const isNew = formData.get('isNew') === 'true';
            const slug = formData.get('slug') || slugify(formData.get('title'));
            const fileName = formData.get('fileName') || (slug + '.md');
            const title = formData.get('title');
            const date = formData.get('date');
            const category = formData.get('category');
            const summary = formData.get('summary');
            const emoji = formData.get('emoji') || '💙';
            const content = formData.get('content');
            
            // Format date for frontmatter
            const dateObj = new Date(date);
            const formattedDate = dateObj.toISOString();
            
            // Create markdown content with frontmatter
            const markdown = `---
title: "${title}"
date: ${formattedDate}
category: "${category}"
summary: "${summary.replace(/"/g, '\\"')}"
emoji: "${emoji}"
featuredImage: ""
---

${content}`;
            
            const repoOwner = config.repoOwner || 'Emmanueld14';
            const repoName = config.repoName || 'bloomly-app';
            const repoBranch = config.repoBranch || 'main';
            const filePath = `content/blog/${fileName}`;
            const apiBase = config.apiBase || 'https://api.github.com';
            
            let sha = null;
            if (!isNew) {
                // Get existing file to get SHA
                const getFileResponse = await fetch(
                    `${apiBase}/repos/${repoOwner}/${repoName}/contents/${filePath}`,
                    {
                        headers: {
                            'Authorization': 'token ' + githubToken,
                            'Accept': 'application/vnd.github.v3+json'
                        }
                    }
                );
                
                if (getFileResponse.ok) {
                    const fileData = await getFileResponse.json();
                    sha = fileData.sha;
                }
            }
            
            // Encode content to base64
            const encodedContent = btoa(unescape(encodeURIComponent(markdown)));
            
            // Create or update file
            const response = await fetch(
                `${apiBase}/repos/${repoOwner}/${repoName}/contents/${filePath}`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': 'token ' + githubToken,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message: isNew ? `Add blog post: ${title}` : `Update blog post: ${title}`,
                        content: encodedContent,
                        branch: repoBranch,
                        ...(sha && { sha: sha })
                    })
                }
            );
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to save post');
            }
            
            showSuccess('Post saved successfully! The site will update automatically.');
            closeModal();
            loadPosts();
        } catch (error) {
            console.error('Error saving post:', error);
            showError('Failed to save post: ' + error.message);
        } finally {
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
        }
    }
    
    // Delete post
    window.deletePost = async function(slug, fileName) {
        if (!confirm(`Are you sure you want to delete "${slug}"? This action cannot be undone.`)) {
            return;
        }
        
        try {
            const repoOwner = config.repoOwner || 'Emmanueld14';
            const repoName = config.repoName || 'bloomly-app';
            const repoBranch = config.repoBranch || 'main';
            const filePath = `content/blog/${fileName}`;
            const apiBase = config.apiBase || 'https://api.github.com';
            
            // First, get the file to get its SHA
            const getFileResponse = await fetch(
                `${apiBase}/repos/${repoOwner}/${repoName}/contents/${filePath}`,
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
                `${apiBase}/repos/${repoOwner}/${repoName}/contents/${filePath}`,
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
                        branch: repoBranch
                    })
                }
            );
            
            if (!deleteResponse.ok) {
                throw new Error('Failed to delete file: ' + deleteResponse.statusText);
            }
            
            showSuccess('Post deleted successfully! The site will update automatically.');
            loadPosts();
        } catch (error) {
            console.error('Error deleting post:', error);
            showError('Failed to delete post: ' + error.message);
        }
    };
    
    // Slugify function
    function slugify(text) {
        return text
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
