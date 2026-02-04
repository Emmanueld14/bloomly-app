/**
 * Bloomly Blog Admin - Form-based Admin Interface
 * Manages blog posts via GitHub API using Personal Access Token
 */

(function() {
    'use strict';
    
    let githubToken = null;
    let githubUser = null;
    const config = typeof GITHUB_CONFIG !== 'undefined' ? GITHUB_CONFIG : {};
    const supabaseConfig = typeof SUPABASE_CONFIG !== 'undefined' ? SUPABASE_CONFIG : {};
    let supabaseClient = null;
    
    // Initialize
    function init() {
        console.log('Admin panel initializing...');

        initSupabaseClient();
        
        // Check if user is logged in
        githubToken = sessionStorage.getItem('github_token');
        const userStr = sessionStorage.getItem('github_user');
        
        if (githubToken && userStr) {
            githubUser = JSON.parse(userStr);
            verifyToken();
        } else {
            showAuth();
        }
        
        // Event listeners
        const githubLoginBtn = document.getElementById('githubLoginBtn');
        if (githubLoginBtn) {
            githubLoginBtn.addEventListener('click', handleGitHubLogin);
        }
        
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
        }
        
        const addPostBtn = document.getElementById('addPostBtn');
        if (addPostBtn) {
            addPostBtn.addEventListener('click', handleAddPost);
        }
        
        const closeModalBtn = document.getElementById('closeModalBtn');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', closeModal);
        }
        
        const cancelBtn = document.getElementById('cancelBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', closeModal);
        }
        
        const postForm = document.getElementById('postForm');
        if (postForm) {
            postForm.addEventListener('submit', handleSavePost);
        }

        const emailPostForm = document.getElementById('emailPostForm');
        if (emailPostForm) {
            emailPostForm.addEventListener('submit', handleEmailPostSubmit);
            configureAdminPublishKey();
        }
        
        // Close modal on outside click
        const postModal = document.getElementById('postModal');
        if (postModal) {
            postModal.addEventListener('click', function(e) {
                if (e.target === this) {
                    closeModal();
                }
            });
        }
        
        console.log('Admin panel initialized');
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
                const errorText = await response.text();
                throw new Error('Invalid token: ' + response.status + ' ' + errorText);
            }
            
            githubUser = await response.json();
            // Store user info
            sessionStorage.setItem('github_user', JSON.stringify(githubUser));
            showAdminContent();
            loadPosts();
        } catch (error) {
            console.error('Token verification error:', error);
            alert('Authentication failed. Please try logging in again.\n\nError: ' + error.message);
            sessionStorage.removeItem('github_token');
            sessionStorage.removeItem('github_user');
            githubToken = null;
            githubUser = null;
            showAuth();
            throw error;
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

        if (window.AppointmentsAdmin && typeof window.AppointmentsAdmin.init === 'function') {
            window.AppointmentsAdmin.init();
        }
    }

    // Initialize Supabase client for notifications
    function initSupabaseClient() {
        if (!window.supabase || typeof window.supabase.createClient !== 'function') {
            console.warn('Supabase JS library not loaded.');
            return;
        }

        if (!supabaseConfig.url || !supabaseConfig.anonKey) {
            console.warn('Supabase config is missing. Check admin/config.js.');
            return;
        }

        supabaseClient = window.supabase.createClient(
            supabaseConfig.url,
            supabaseConfig.anonKey
        );
    }

    function isSupabaseReady() {
        return Boolean(supabaseClient && supabaseConfig.url && supabaseConfig.anonKey);
    }

    function configureAdminPublishKey() {
        const adminKeyGroup = document.getElementById('adminPublishKeyGroup');
        if (!adminKeyGroup) return;

        const configuredKey = (supabaseConfig.adminPublishKey || '').trim();
        const hasConfiguredKey = configuredKey && configuredKey !== 'REPLACE_WITH_ADMIN_PUBLISH_KEY';

        adminKeyGroup.style.display = hasConfiguredKey ? 'none' : 'block';
    }

    function setEmailPostMessage(message, type) {
        const messageEl = document.getElementById('emailPostMessage');
        if (!messageEl) return;

        messageEl.textContent = message || '';
        messageEl.classList.remove('success', 'error');
        if (type === 'success') {
            messageEl.classList.add('success');
        }
        if (type === 'error') {
            messageEl.classList.add('error');
        }
    }

    function getAdminPublishKey() {
        const configuredKey = (supabaseConfig.adminPublishKey || '').trim();
        if (configuredKey && configuredKey !== 'REPLACE_WITH_ADMIN_PUBLISH_KEY') {
            return configuredKey;
        }

        const adminKeyInput = document.getElementById('adminPublishKey');
        return adminKeyInput ? adminKeyInput.value.trim() : '';
    }

    async function handleEmailPostSubmit(event) {
        event.preventDefault();

        if (!isSupabaseReady()) {
            setEmailPostMessage('Supabase is not configured. Check admin/config.js.', 'error');
            return;
        }

        const titleInput = document.getElementById('emailPostTitle');
        const summaryInput = document.getElementById('emailPostSummary');
        const urlInput = document.getElementById('emailPostUrl');

        const title = titleInput ? titleInput.value.trim() : '';
        const summary = summaryInput ? summaryInput.value.trim() : '';
        const url = urlInput ? urlInput.value.trim() : '';

        if (!title || !summary || !url) {
            setEmailPostMessage('Title, summary, and URL are required.', 'error');
            return;
        }

        const adminKey = getAdminPublishKey();
        if (!adminKey) {
            setEmailPostMessage('Admin publish key not configured. Email update skipped.', 'success');
            return;
        }

        const notifyUrl = supabaseConfig.notifyFunctionUrl ||
            `${supabaseConfig.url}/functions/v1/notify-subscribers`;

        const submitBtn = document.getElementById('emailPostSubmit');
        const originalText = submitBtn ? submitBtn.textContent : 'Send email update';
        if (submitBtn) {
            submitBtn.textContent = 'Sending...';
            submitBtn.disabled = true;
        }

        try {
            const payload = {
                post: {
                    title,
                    summary,
                    url,
                    slug: slugify(title)
                }
            };

            const response = await fetch(notifyUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${supabaseConfig.anonKey}`,
                    'X-Admin-Key': adminKey
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json().catch(() => ({}));

            if (!response.ok) {
                const errorMessage = result.error || 'Failed to send email updates.';
                setEmailPostMessage(errorMessage, 'error');
                return;
            }

            const sent = Number(result.sent || 0);
            const skipped = Number(result.skipped || 0);
            const failed = Number(result.failed || 0);
            setEmailPostMessage(
                `Email update complete. Sent: ${sent}, failed: ${failed}, skipped: ${skipped}.`,
                failed > 0 ? 'error' : 'success'
            );

            if (event.target && typeof event.target.reset === 'function') {
                event.target.reset();
            }
        } catch (error) {
            console.error('Email update failed:', error);
            setEmailPostMessage('Failed to send email updates. Please try again.', 'error');
        } finally {
            if (submitBtn) {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        }
    }
    
    // Handle GitHub login
    function handleGitHubLogin() {
        const clientId = config.clientId;
        const redirectUri = config.redirectUri || window.location.origin + '/admin/callback.html';
        
        if (!clientId || clientId === 'YOUR_GITHUB_CLIENT_ID_HERE') {
            alert('GitHub OAuth is not configured. Please check admin/config.js');
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
        githubToken = null;
        githubUser = null;
        showAuth();
    }
    
    // Load blog posts using BlogAdmin API
    async function loadPosts() {
        const postsList = document.getElementById('postsList');
        postsList.innerHTML = '<div class="loading">Loading posts...</div>';
        
        try {
            // Use BlogAdmin API for consistent data source
            const posts = await window.BlogAdmin.listPosts();
            
            // Render posts
            if (posts.length === 0) {
                postsList.innerHTML = '<p style="text-align: center; color: var(--color-gray-550);">No blog posts found.</p>';
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
            postsList.innerHTML = '<p style="text-align: center; color: var(--color-danger);">Error loading posts. Please try again.</p>';
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
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            setTimeout(() => {
                errorDiv.style.display = 'none';
            }, 5000);
        } else {
            // Fallback if error div doesn't exist yet
            alert(message);
        }
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

    async function publishPostToSupabase(post) {
        if (!isSupabaseReady()) {
            return { ok: false, message: 'Supabase is not configured.' };
        }

        const adminKey = getAdminPublishKey();
        if (!adminKey) {
            return { ok: false, message: 'Admin publish key is required to sync posts.' };
        }

        const publishUrl = supabaseConfig.publishPostFunctionUrl ||
            `${supabaseConfig.url}/functions/v1/publish-post`;
        const postUrl = `${window.location.origin}/blog/${encodeURIComponent(post.slug)}`;

        try {
            const response = await fetch(publishUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${supabaseConfig.anonKey}`,
                    'X-Admin-Key': adminKey
                },
                body: JSON.stringify({
                    post: {
                        title: post.title,
                        summary: post.summary,
                        url: postUrl,
                        slug: post.slug
                    }
                })
            });

            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
                return { ok: false, message: result.error || 'Failed to sync post.' };
            }

            return { ok: true };
        } catch (error) {
            console.error('Publish post sync failed:', error);
            return { ok: false, message: 'Failed to sync post.' };
        }
    }

    async function notifySubscribersForPost(post) {
        if (!isSupabaseReady()) {
            return { ok: false, message: 'Supabase is not configured.' };
        }

        const adminKey = getAdminPublishKey();
        if (!adminKey) {
            return { ok: false, message: 'Admin publish key is required to notify subscribers.' };
        }

        const notifyUrl = supabaseConfig.notifyFunctionUrl ||
            `${supabaseConfig.url}/functions/v1/notify-subscribers`;
        const postUrl = `${window.location.origin}/blog/${encodeURIComponent(post.slug)}`;

        try {
            const response = await fetch(notifyUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${supabaseConfig.anonKey}`,
                    'X-Admin-Key': adminKey
                },
                body: JSON.stringify({
                    post: {
                        title: post.title,
                        summary: post.summary,
                        url: postUrl,
                        slug: post.slug
                    }
                })
            });

            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
                return { ok: false, message: result.error || 'Failed to notify subscribers.' };
            }

            return { ok: true, result };
        } catch (error) {
            console.error('Notify subscribers failed:', error);
            return { ok: false, message: 'Failed to notify subscribers.' };
        }
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
    
    // Handle save post with verification
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
            const title = formData.get('title');
            const date = formData.get('date');
            const category = formData.get('category');
            const summary = formData.get('summary');
            const emoji = formData.get('emoji') || '💙';
            const content = formData.get('content');
            
            // Use BlogAdmin API for save operation
            const result = await window.BlogAdmin.savePost({
                slug,
                title,
                date,
                category,
                summary,
                emoji,
                content
            }, isNew);
            
            // Verify operation succeeded
            saveBtn.textContent = 'Verifying...';
            
            // Wait a moment for GitHub to propagate
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Reload posts to confirm
            await loadPosts();

            const publishResult = await publishPostToSupabase({ title, summary, slug });
            if (publishResult.ok) {
                if (isNew) {
                    const notifyResult = await notifySubscribersForPost({ title, summary, slug });
                    if (notifyResult.ok) {
                        showSuccess(`Post created successfully! Email update sent to subscribers.`);
                    } else {
                        showSuccess('Post created successfully!');
                        showError(notifyResult.message || 'Post saved, but email notification failed.');
                    }
                } else {
                    showSuccess('Post updated successfully!');
                }
            } else {
                showSuccess(`Post ${isNew ? 'created' : 'updated'} successfully!`);
                showError(publishResult.message || 'Post saved, but failed to sync.');
            }
            closeModal();
            
        } catch (error) {
            console.error('Error saving post:', error);
            showError('Failed to save post: ' + error.message);
        } finally {
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
        }
    }
    
    // Delete post with verification
    window.deletePost = async function(slug, fileName) {
        if (!confirm(`Are you sure you want to delete "${slug}"? This action cannot be undone.`)) {
            return;
        }
        
        // Find and disable the delete button
        const deleteButtons = document.querySelectorAll('.btn-delete');
        deleteButtons.forEach(btn => {
            if (btn.textContent === 'Delete' && btn.onclick && btn.onclick.toString().includes(slug)) {
                btn.textContent = 'Deleting...';
                btn.disabled = true;
            }
        });
        
        try {
            // Use BlogAdmin API for delete operation
            const result = await window.BlogAdmin.deletePost(slug, fileName);
            
            // Optimistically remove from UI immediately
            const postsList = document.getElementById('postsList');
            const postItems = postsList.querySelectorAll('.post-item');
            postItems.forEach(item => {
                const deleteBtn = item.querySelector('.btn-delete');
                if (deleteBtn && deleteBtn.onclick && deleteBtn.onclick.toString().includes(slug)) {
                    item.style.opacity = '0.5';
                    item.style.transition = 'opacity 0.3s';
                    setTimeout(() => {
                        item.remove();
                    }, 300);
                }
            });
            
            // Wait for GitHub to propagate
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Reload to verify deletion
            await loadPosts();
            
            showSuccess('Post deleted successfully! Verified and removed from all sources.');
            
        } catch (error) {
            console.error('Error deleting post:', error);
            showError('Failed to delete post: ' + error.message);
            
            // Re-enable buttons
            deleteButtons.forEach(btn => {
                if (btn.disabled) {
                    btn.textContent = 'Delete';
                    btn.disabled = false;
                }
            });
            
            // Reload to show current state
            loadPosts();
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
