/**
 * Blog Listing Loader
 * Runtime-only fetching from GitHub API
 * No caching, no static files, no build-time data
 */

(function() {
    'use strict';

    // Format date for display
    function formatDate(dateString) {
        if (!dateString) return 'No date';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }

    // Load and render blog posts
    async function loadBlogPosts() {
        const blogGrid = document.getElementById('blogGrid');
        if (!blogGrid) {
            console.error('Blog grid element not found');
            return;
        }

        // Show loading state
        blogGrid.innerHTML = '<div style="text-align: center; padding: var(--space-2xl); color: var(--color-gray-600);">Loading blog posts...</div>';

        try {
            // Get list of posts from GitHub
            const posts = await blogAPI.listPosts();
            
            if (posts.length === 0) {
                blogGrid.innerHTML = '<p style="text-align: center; color: var(--color-gray-600); padding: var(--space-2xl);">No blog posts found.</p>';
                return;
            }

            // Load content for each post
            const postsWithContent = await Promise.allSettled(
                posts.map(async (post) => {
                    try {
                        const content = await blogAPI.getPost(post.slug);
                        return {
                            ...post,
                            ...content,
                            html: blogAPI.markdownToHTML(content.body)
                        };
                    } catch (error) {
                        console.warn(`Failed to load post ${post.slug}:`, error);
                        return null;
                    }
                })
            );

            // Filter out failed loads
            const validPosts = postsWithContent
                .filter(result => result.status === 'fulfilled' && result.value !== null)
                .map(result => result.value);

            if (validPosts.length === 0) {
                throw new Error('No posts could be loaded');
            }

            // Sort by date (newest first)
            validPosts.sort((a, b) => {
                const dateA = new Date(a.metadata.date || 0);
                const dateB = new Date(b.metadata.date || 0);
                return dateB - dateA;
            });

            // Render posts
            blogGrid.innerHTML = validPosts.map(post => {
                const emoji = post.metadata.emoji || '💙';
                const date = formatDate(post.metadata.date);
                const category = post.metadata.category || 'Mental Health';
                
                return `
                    <article class="blog-card fade-in">
                        <div class="blog-card-image" style="font-size: var(--text-5xl);">${emoji}</div>
                        <div class="blog-card-content">
                            <div class="blog-card-date">${date} • ${category}</div>
                            <h3>${post.metadata.title}</h3>
                            <p>${post.metadata.summary || ''}</p>
                            <a href="blog-post.html?slug=${post.slug}" class="blog-card-link">Read More →</a>
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
            
            // Show error with retry
            blogGrid.innerHTML = `
                <div style="text-align: center; padding: var(--space-2xl);">
                    <p style="color: var(--color-gray-600); margin-bottom: var(--space-md); font-size: var(--text-lg);">
                        Unable to load blog posts
                    </p>
                    <p style="color: var(--color-gray-500); margin-bottom: var(--space-lg); font-size: var(--text-sm);">
                        ${error.message || 'Please try again.'}
                    </p>
                    <button onclick="window.location.reload(true)" 
                            style="padding: var(--space-md) var(--space-xl); 
                                   background: linear-gradient(135deg, #FF78B9 0%, #C8A7FF 50%, #5FA8FF 100%); 
                                   color: white; 
                                   border: none; 
                                   border-radius: var(--radius-lg); 
                                   font-weight: 600; 
                                   cursor: pointer;
                                   font-size: var(--text-base;">
                        🔄 Retry
                    </button>
                </div>
            `;
        }
    }

    // Auto-refresh every 30 seconds (when page visible)
    let refreshInterval = null;
    
    function startAutoRefresh() {
        if (refreshInterval) clearInterval(refreshInterval);
        
        refreshInterval = setInterval(() => {
            if (!document.hidden) {
                loadBlogPosts();
            }
        }, 30000); // 30 seconds
    }

    // Manual refresh function
    window.refreshBlogPosts = function() {
        loadBlogPosts();
    };

    // Initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            loadBlogPosts();
            startAutoRefresh();
        });
    } else {
        loadBlogPosts();
        startAutoRefresh();
    }

    // Refresh when page becomes visible
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            loadBlogPosts();
            startAutoRefresh();
        }
    });

})();

