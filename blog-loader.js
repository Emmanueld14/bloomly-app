/**
 * Blog Loader - Dynamically loads blog posts from markdown files
 * Uses marked.js for markdown parsing
 */

(function() {
    'use strict';

    // Simple markdown parser (basic implementation)
    function parseMarkdown(markdown) {
        // Split frontmatter and body
        const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
        const match = markdown.match(frontmatterRegex);
        
        if (!match) return null;
        
        const frontmatter = match[1];
        const body = match[2];
        
        // Parse frontmatter
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
        
        // Simple markdown to HTML conversion
        let html = body
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h2>$1</h2>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/^- (.*$)/gim, '<li>$1</li>')
            .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/^(.*)$/gm, '<p>$1</p>');
        
        // Clean up empty paragraphs
        html = html.replace(/<p><\/p>/g, '');
        
        return {
            metadata: metadata,
            body: html
        };
    }

    // Format date
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }

    // Get slug from filename
    function getSlug(filename) {
        return filename.replace('.md', '');
    }

    // Store last known post count and hashes for change detection
    let lastPostCount = 0;
    let lastPostHashes = new Set();
    let isLoading = false;

    // Load blog posts dynamically from GitHub
    async function loadBlogPosts(showNotification = false) {
        const blogGrid = document.getElementById('blogGrid');
        if (!blogGrid) return;

        // Prevent concurrent loads
        if (isLoading) return;
        isLoading = true;

        try {
            const posts = [];

            // Fetch list of markdown files from GitHub API (public repo, no auth needed)
            // This dynamically gets all .md files from content/blog/ directory
            const repoOwner = 'Emmanueld14';
            const repoName = 'bloomly-app';
            const repoBranch = 'main';
            
            // Add cache-busting timestamp
            const cacheBuster = Date.now();
            
            try {
                // Get list of files in content/blog directory from GitHub
                const listResponse = await fetch(
                    `https://api.github.com/repos/${repoOwner}/${repoName}/contents/content/blog?ref=${repoBranch}&t=${cacheBuster}`,
                    {
                        headers: {
                            'Accept': 'application/vnd.github.v3+json',
                            'Cache-Control': 'no-cache, no-store, must-revalidate',
                            'Pragma': 'no-cache'
                        },
                        cache: 'no-store'
                    }
                );
                
                if (listResponse.ok) {
                    const files = await listResponse.json();
                    
                    // Handle case where API returns a single file object instead of array
                    const fileArray = Array.isArray(files) ? files : [files];
                    
                    const markdownFiles = fileArray
                        .filter(file => file && file.name && file.name.endsWith('.md') && file.type === 'file')
                        .map(file => file.name);
                    
                    console.log(`Found ${markdownFiles.length} markdown files:`, markdownFiles);
                    
                    if (markdownFiles.length === 0) {
                        throw new Error('No blog posts found in repository');
                    }
                    
                    // Check if posts have changed
                    const currentHashes = new Set(markdownFiles);
                    const hasChanged = lastPostCount !== markdownFiles.length || 
                                      ![...currentHashes].every(hash => lastPostHashes.has(hash));
                    
                    // Load each post from raw GitHub content
                    for (const filename of markdownFiles) {
                        try {
                            const rawUrl = `https://raw.githubusercontent.com/${repoOwner}/${repoName}/${repoBranch}/content/blog/${filename}?t=${cacheBuster}&r=${Math.random()}`;
                            const response = await fetch(rawUrl, {
                                cache: 'no-store', // Prevent caching
                                headers: {
                                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                                    'Pragma': 'no-cache',
                                    'If-None-Match': '' // Force fresh fetch
                                }
                            });
                            
                            if (!response.ok) {
                                if (response.status === 404) {
                                    console.warn(`Post ${filename} not found (may have been deleted)`);
                                } else {
                                    console.warn(`Failed to fetch ${filename}: ${response.status} ${response.statusText}`);
                                }
                                continue;
                            }
                            
                            const markdown = await response.text();
                            
                            if (!markdown || markdown.trim().length === 0) {
                                console.warn(`Empty content for ${filename}`);
                                continue;
                            }
                            
                            const parsed = parseMarkdown(markdown);
                            
                            if (parsed && parsed.metadata && parsed.metadata.title) {
                                parsed.slug = getSlug(filename);
                                posts.push(parsed);
                                console.log(`✓ Loaded: ${parsed.metadata.title}`);
                            } else {
                                console.warn(`Failed to parse ${filename}:`, parsed);
                            }
                        } catch (error) {
                            console.error(`Error loading ${filename}:`, error);
                        }
                    }
                } else {
                    let errorText = 'Unknown error';
                    try {
                        const errorData = await listResponse.json();
                        errorText = errorData.message || JSON.stringify(errorData);
                    } catch {
                        errorText = await listResponse.text().catch(() => listResponse.statusText);
                    }
                    
                    console.error('GitHub API failed:', listResponse.status, errorText);
                    
                    // Provide helpful error messages
                    if (listResponse.status === 403) {
                        throw new Error('GitHub API rate limit exceeded. Please wait a few minutes and try again.');
                    } else if (listResponse.status === 404) {
                        throw new Error('Repository or blog directory not found. Please check the configuration.');
                    } else {
                        throw new Error(`GitHub API error (${listResponse.status}): ${errorText}`);
                    }
                }
            } catch (apiError) {
                console.error('GitHub API failed:', apiError);
                
                // Don't use fallback - show error instead
                // This prevents showing stale cached posts
                throw new Error('Unable to load posts from GitHub. Please check your connection and try again. Error: ' + apiError.message);
            }

            // Sort by date (newest first)
            posts.sort((a, b) => {
                const dateA = new Date(a.metadata.date);
                const dateB = new Date(b.metadata.date);
                return dateB - dateA;
            });

            // Show notification if new posts detected
            if (hasChanged && lastPostCount > 0 && showNotification) {
                const newPostCount = posts.length - lastPostCount;
                if (newPostCount > 0) {
                    showNewPostNotification(`✨ ${newPostCount} new post${newPostCount > 1 ? 's' : ''} available!`);
                }
            }

            // Update tracking
            lastPostCount = posts.length;
            lastPostHashes = new Set(markdownFiles || []);

            // Render posts
            blogGrid.innerHTML = posts.map(post => {
                const emoji = post.metadata.emoji || '💙';
                const date = formatDate(post.metadata.date);
                const category = post.metadata.category || 'Mental Health';
                const slug = post.slug;
                
                return `
                    <article class="blog-card fade-in">
                        <div class="blog-card-image" style="font-size: var(--text-5xl);">${emoji}</div>
                        <div class="blog-card-content">
                            <div class="blog-card-date">${date} • ${category}</div>
                            <h3>${post.metadata.title}</h3>
                            <p>${post.metadata.summary}</p>
                            <a href="blog-post.html?slug=${slug}" class="blog-card-link">Read More →</a>
                        </div>
                    </article>
                `;
            }).join('');

            // Trigger fade-in animations
            setTimeout(() => {
                const cards = blogGrid.querySelectorAll('.blog-card');
                cards.forEach((card, index) => {
                    setTimeout(() => {
                        card.classList.add('visible');
                    }, index * 100);
                });
            }, 100);

        } catch (error) {
            console.error('Error loading blog posts:', error);
            
            // Show detailed error with retry button
            const errorHtml = `
                <div style="text-align: center; padding: var(--space-2xl);">
                    <p style="color: var(--color-gray-600); margin-bottom: var(--space-md); font-size: var(--text-lg);">
                        Unable to load blog posts
                    </p>
                    <p style="color: var(--color-gray-500); margin-bottom: var(--space-lg); font-size: var(--text-sm);">
                        ${error.message || 'Please try again.'}
                    </p>
                    <button onclick="window.refreshBlogPosts(); window.location.reload(true);" 
                            style="padding: var(--space-md) var(--space-xl); 
                                   background: linear-gradient(135deg, #FF78B9 0%, #C8A7FF 50%, #5FA8FF 100%); 
                                   color: white; 
                                   border: none; 
                                   border-radius: var(--radius-lg); 
                                   font-weight: 600; 
                                   cursor: pointer;
                                   font-size: var(--text-base;">
                        🔄 Retry Loading Posts
                    </button>
                    <p style="margin-top: var(--space-md); font-size: var(--text-sm); color: var(--color-gray-500);">
                        If this persists, try <a href="/blog-cache-clear.html" style="color: var(--color-blue); text-decoration: underline;">clearing your cache</a>
                    </p>
                </div>
            `;
            blogGrid.innerHTML = errorHtml;
        } finally {
            isLoading = false;
        }
    }

    // Show notification for new posts
    function showNewPostNotification(message) {
        // Remove existing notification if any
        const existing = document.getElementById('newPostNotification');
        if (existing) existing.remove();

        const notification = document.createElement('div');
        notification.id = 'newPostNotification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #FF78B9 0%, #C8A7FF 50%, #5FA8FF 100%);
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
            z-index: 10000;
            font-weight: 600;
            animation: slideIn 0.3s ease-out;
            cursor: pointer;
        `;
        notification.textContent = message;
        notification.onclick = () => {
            window.location.reload();
        };
        
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(400px);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);

    // Auto-refresh mechanism: Check for new posts every 15 seconds when page is visible
    let refreshInterval = null;
    
    function startAutoRefresh() {
        // Clear existing interval
        if (refreshInterval) clearInterval(refreshInterval);
        
        // Check every 15 seconds (more frequent for better UX)
        refreshInterval = setInterval(() => {
            // Only check if page is visible (not in background tab)
            if (!document.hidden) {
                loadBlogPosts(true); // true = show notification if new posts
            }
        }, 15000); // 15 seconds
    }

    // Manual refresh function (exposed globally)
    window.refreshBlogPosts = function() {
        lastPostCount = 0;
        lastPostHashes = new Set();
        loadBlogPosts(false);
    };

    // Start auto-refresh when page becomes visible
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            startAutoRefresh();
            // Also check immediately when page becomes visible
            loadBlogPosts(true);
        } else {
            if (refreshInterval) {
                clearInterval(refreshInterval);
                refreshInterval = null;
            }
        }
    });

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            loadBlogPosts();
            startAutoRefresh();
        });
    } else {
        loadBlogPosts();
        startAutoRefresh();
    }

})();

