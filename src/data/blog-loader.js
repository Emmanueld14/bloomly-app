/**
 * Blog Listing Loader
 * Runtime-only fetching from GitHub API
 * NO caching, NO static files, NO localStorage
 */

(function() {
    'use strict';

    // Ensure blogAPI is available
    if (typeof blogAPI === 'undefined') {
        console.error('blogAPI not loaded! Make sure blog-api.js is loaded before blog-loader.js');
        return;
    }

    // Format date for display
    function formatDate(dateString) {
        if (!dateString) return 'No date';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'Invalid date';
            return date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
        } catch (e) {
            return 'Invalid date';
        }
    }

    // Load and render blog posts
    async function loadBlogPosts() {
        const blogGrid = document.getElementById('blogGrid');
        if (!blogGrid) {
            console.error('Blog grid element #blogGrid not found');
            return;
        }

        // Show loading state
        blogGrid.innerHTML = '<div style="text-align: center; padding: var(--space-2xl); color: var(--color-gray-600);">Loading blog posts...</div>';

        try {
            console.log('Fetching blog posts from GitHub...');
            
            // Get list of posts from GitHub
            const posts = await blogAPI.listPosts();
            
            console.log(`Received ${posts.length} post(s) from GitHub`);
            
            if (posts.length === 0) {
                blogGrid.innerHTML = `
                    <div style="text-align: center; padding: var(--space-2xl); color: var(--color-gray-600);">
                        <p style="font-size: var(--text-lg); margin-bottom: var(--space-md);">No blog posts found.</p>
                        <p style="font-size: var(--text-sm); color: var(--color-gray-500);">Posts will appear here once they are published.</p>
                    </div>
                `;
                return;
            }

            // Load content for each post
            console.log('Loading content for posts...');
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

            console.log(`Successfully loaded ${validPosts.length} post(s)`);

            if (validPosts.length === 0) {
                blogGrid.innerHTML = `
                    <div style="text-align: center; padding: var(--space-2xl);">
                        <p style="color: var(--color-gray-600); margin-bottom: var(--space-md); font-size: var(--text-lg);">
                            Unable to load blog posts
                        </p>
                        <p style="color: var(--color-gray-500); margin-bottom: var(--space-lg); font-size: var(--text-sm);">
                            All posts failed to load. Please check your connection and try again.
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
                return;
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
                        ${error.message || 'Please check your connection and try again.'}
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

    // Manual refresh function
    window.refreshBlogPosts = function() {
        console.log('Manual refresh triggered');
        loadBlogPosts();
    };

    // Initialize
    function init() {
        console.log('Initializing blog loader...');
        loadBlogPosts();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
