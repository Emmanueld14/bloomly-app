/**
 * Bloomly Blog Admin - Form-based Admin Interface
 * Manages blog posts via GitHub API using Personal Access Token
 */

(function() {
    'use strict';

    const ADMIN_SESSION_KEY = 'bloomly_admin_password';

    let githubToken = null;
    let githubUser = null;
    const config = typeof GITHUB_CONFIG !== 'undefined' ? GITHUB_CONFIG : {};
    const supabaseConfig = typeof SUPABASE_CONFIG !== 'undefined' ? SUPABASE_CONFIG : {};
    let supabaseClient = null;

    function getAdminPassword() {
        return (sessionStorage.getItem(ADMIN_SESSION_KEY) || '').trim();
    }

    function setAdminPassword(value) {
        if (value) {
            sessionStorage.setItem(ADMIN_SESSION_KEY, value);
        } else {
            sessionStorage.removeItem(ADMIN_SESSION_KEY);
        }
    }

    function setAuthInlineError(message) {
        const authCard = document.querySelector('#authSection .admin-auth-card');
        if (!authCard) return;

        let errorEl = document.getElementById('authInlineError');
        if (!message) {
            if (errorEl) {
                errorEl.remove();
            }
            return;
        }

        if (!errorEl) {
            errorEl = document.createElement('p');
            errorEl.id = 'authInlineError';
            errorEl.className = 'inline-error';
            authCard.appendChild(errorEl);
        }
        errorEl.textContent = message;
        errorEl.style.display = 'block';
    }

    function clearOAuthParamsFromUrl() {
        const url = new URL(window.location.href);
        url.searchParams.delete('code');
        url.searchParams.delete('state');
        url.searchParams.delete('error');
        url.searchParams.delete('error_description');
        const query = url.searchParams.toString();
        const nextUrl = `${url.pathname}${query ? `?${query}` : ''}${url.hash || ''}`;
        window.history.replaceState({}, document.title, nextUrl);
    }

    async function exchangeGithubCodeForToken(code) {
        const apiUrl = config.vercelApiUrl || 'https://bloomly-app.onrender.com/api/github-auth';
        const redirectUri = config.redirectUri || `${window.location.origin}/admin/callback.html`;
        const response = await fetch(apiUrl, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                client_id: config.clientId,
                code,
                redirect_uri: redirectUri
            })
        });

        const text = await response.text().catch(() => '');
        if (!text) {
            throw new Error(`OAuth server returned an empty response (HTTP ${response.status}).`);
        }

        let data;
        try {
            data = JSON.parse(text);
        } catch {
            const params = new URLSearchParams(text);
            const accessToken = params.get('access_token');
            if (!accessToken) {
                throw new Error(`OAuth response format was invalid (HTTP ${response.status}).`);
            }
            data = { access_token: accessToken };
        }

        if (!response.ok) {
            throw new Error(data.error || `OAuth token exchange failed (HTTP ${response.status}).`);
        }
        if (!data.access_token) {
            throw new Error('OAuth token exchange succeeded but no access token was returned.');
        }

        return data.access_token;
    }

    async function maybeHandleOAuthOnAdminRoot() {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');

        if (!code && !error) {
            return false;
        }

        // Always return to a clean /admin URL after processing.
        clearOAuthParamsFromUrl();

        if (error) {
            showAuth();
            setAuthInlineError(errorDescription || `Authentication failed: ${error}`);
            return true;
        }

        try {
            const accessToken = await exchangeGithubCodeForToken(code);
            sessionStorage.setItem('github_token', accessToken);

            const userResponse = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': `token ${accessToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            if (!userResponse.ok) {
                throw new Error(`GitHub user lookup failed (HTTP ${userResponse.status}).`);
            }

            const user = await userResponse.json();
            sessionStorage.setItem('github_user', JSON.stringify(user));
            githubToken = accessToken;
            githubUser = user;
            setAuthInlineError('');
            afterGitHubSessionReady();
        } catch (oauthError) {
            console.error('Admin root OAuth handling failed:', oauthError);
            sessionStorage.removeItem('github_token');
            sessionStorage.removeItem('github_user');
            githubToken = null;
            githubUser = null;
            showAuth();
            setAuthInlineError(oauthError.message || 'GitHub sign-in failed.');
        }

        return true;
    }

    function toggleSectionVisibility(element, isVisible, visibleDisplay) {
        if (!element) return;
        element.hidden = !isVisible;
        element.style.display = isVisible ? (visibleDisplay || 'block') : 'none';
    }

    function initAdminShellNav() {
        const nav = document.getElementById('adminSidebarNav');
        if (!nav) return;

        nav.querySelectorAll('[data-admin-panel]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const panel = btn.getAttribute('data-admin-panel');
                nav.querySelectorAll('.sidebar-link').forEach((link) => {
                    link.classList.toggle('is-active', link.getAttribute('data-admin-panel') === panel);
                });
                document.querySelectorAll('[data-admin-panel-target]').forEach((section) => {
                    section.classList.toggle(
                        'is-active',
                        section.getAttribute('data-admin-panel-target') === panel
                    );
                });
                const titleEl = document.getElementById('adminViewTitle');
                const subEl = document.getElementById('adminViewSubtitle');
                if (titleEl) titleEl.textContent = btn.getAttribute('data-title') || 'Admin';
                if (subEl) subEl.textContent = btn.getAttribute('data-subtitle') || '';
            });
        });
    }
    
    // Initialize
    async function init() {
        console.log('Admin panel initializing...');

        initSupabaseClient();

        const handledOAuthOnRoot = await maybeHandleOAuthOnAdminRoot();
        if (handledOAuthOnRoot) {
            console.log('Admin OAuth callback processed on /admin root.');
            return;
        }
        
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
        }

        const adminUnlockBtn = document.getElementById('adminUnlockBtn');
        if (adminUnlockBtn) {
            adminUnlockBtn.addEventListener('click', handleAdminUnlock);
        }
        const adminPasswordInput = document.getElementById('adminPasswordInput');
        if (adminPasswordInput) {
            adminPasswordInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAdminUnlock();
                }
            });
        }
        const adminLockBtn = document.getElementById('adminLockBtn');
        if (adminLockBtn) {
            adminLockBtn.addEventListener('click', handleAdminLock);
        }

        initAdminShellNav();
        
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
    
    function showAuth() {
        const authSection = document.getElementById('authSection');
        const unlockSection = document.getElementById('adminUnlockSection');
        const shell = document.getElementById('adminAppShell');
        toggleSectionVisibility(authSection, true, 'grid');
        toggleSectionVisibility(unlockSection, false);
        toggleSectionVisibility(shell, false);
    }

    function showAdminUnlock() {
        const authSection = document.getElementById('authSection');
        const unlockSection = document.getElementById('adminUnlockSection');
        const shell = document.getElementById('adminAppShell');
        toggleSectionVisibility(authSection, false);
        toggleSectionVisibility(unlockSection, true, 'grid');
        toggleSectionVisibility(shell, false);
        const err = document.getElementById('adminUnlockError');
        if (err) {
            err.textContent = '';
            err.style.display = 'none';
        }
        const input = document.getElementById('adminPasswordInput');
        if (input) {
            input.value = '';
            input.focus();
        }
    }

    function handleAdminUnlock() {
        const input = document.getElementById('adminPasswordInput');
        const err = document.getElementById('adminUnlockError');
        const password = input ? input.value.trim() : '';
        if (!password) {
            if (err) {
                err.textContent = 'Enter your admin password.';
                err.style.display = 'block';
            }
            return;
        }
        setAdminPassword(password);
        if (err) {
            err.textContent = '';
            err.style.display = 'none';
        }
        showAdminApp();
    }

    function handleAdminLock() {
        setAdminPassword('');
        showAdminUnlock();
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
            afterGitHubSessionReady();
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
    
    function afterGitHubSessionReady() {
        if (getAdminPassword()) {
            showAdminApp();
        } else {
            showAdminUnlock();
        }
    }

    function showAdminApp() {
        const authSection = document.getElementById('authSection');
        const unlockSection = document.getElementById('adminUnlockSection');
        const shell = document.getElementById('adminAppShell');
        toggleSectionVisibility(authSection, false);
        toggleSectionVisibility(unlockSection, false);
        toggleSectionVisibility(shell, true, 'grid');

        if (githubUser) {
            const av = document.getElementById('userAvatar');
            const avSide = document.getElementById('sidebarUserAvatar');
            const name = document.getElementById('userName');
            const nameSide = document.getElementById('sidebarUserName');
            const email = document.getElementById('userEmail');
            if (av) av.src = githubUser.avatar_url;
            if (avSide) avSide.src = githubUser.avatar_url;
            if (name) name.textContent = githubUser.name || githubUser.login;
            if (nameSide) nameSide.textContent = githubUser.name || githubUser.login;
            if (email) email.textContent = githubUser.email || 'No email';
        }

        loadPosts();

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
        return getAdminPassword();
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
            setEmailPostMessage('Unlock admin with your password first (use Lock / unlock in the sidebar).', 'error');
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
        setAdminPassword('');
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
            return { ok: false, message: 'Unlock admin with your password first to sync posts to Supabase.' };
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
            return { ok: false, message: 'Unlock admin with your password first to notify subscribers.' };
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
