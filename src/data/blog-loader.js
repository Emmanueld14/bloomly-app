/**
 * Blog Listing Loader
 * Local content first with GitHub fallback
 * NO caching, NO localStorage (debug flag only)
 */

(function() {
    'use strict';

    let BLOG_DEBUG = false;
    try {
        BLOG_DEBUG = Boolean(
            window.localStorage &&
            window.localStorage.getItem('bloomly:blog-debug') === 'true'
        );
    } catch (error) {
        BLOG_DEBUG = false;
    }
    const logDebug = (...args) => {
        if (BLOG_DEBUG) {
            console.log(...args);
        }
    };
    const warnDebug = (...args) => {
        if (BLOG_DEBUG) {
            console.warn(...args);
        }
    };

    // Ensure blogAPI is available
    if (typeof blogAPI === 'undefined') {
        warnDebug('blogAPI not loaded! Make sure blog-api.js is loaded before blog-loader.js');
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

    let cachedPosts = [];
    let activeCategorySlug = 'all';
    let categoryOptions = [];

    function getCategorySlug(value) {
        if (window.BloomlyBlog && typeof window.BloomlyBlog.normalizeCategory === 'function') {
            return window.BloomlyBlog.normalizeCategory(value);
        }
        return String(value || '')
            .trim()
            .toLowerCase()
            .replace(/&/g, 'and')
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');
    }

    function buildCategoryOptionsFromPosts(posts) {
        const seen = new Set();
        const categories = [];

        posts.forEach((post) => {
            const label = post.metadata.category || 'Uncategorized';
            const slug = getCategorySlug(label);
            if (!slug || seen.has(slug)) return;
            seen.add(slug);
            categories.push({ label, slug });
        });

        categories.sort((a, b) => a.label.localeCompare(b.label));
        return [{ label: 'All', slug: 'all' }, ...categories];
    }

    function updateCategoryNav(activeSlug) {
        const navLinks = document.querySelectorAll('[data-blog-category-panel] .blog-category-pill');
        navLinks.forEach((link) => {
            const slug = link.dataset.categorySlug;
            link.classList.toggle('is-active', slug === activeSlug);
        });
    }

    function updateCategoryUrl(activeSlug) {
        const url = new URL('/blog', window.location.origin);
        if (activeSlug && activeSlug !== 'all') {
            url.searchParams.set('category', activeSlug);
        } else {
            url.searchParams.delete('category');
        }
        window.history.pushState({ category: activeSlug }, '', url.toString());
    }

    function renderPostsForCategory(blogGrid, activeSlug) {
        const filteredPosts = activeSlug === 'all'
            ? cachedPosts
            : cachedPosts.filter((post) => getCategorySlug(post.metadata.category || '') === activeSlug);

        if (!filteredPosts.length) {
            const activeLabel = categoryOptions.find((option) => option.slug === activeSlug)?.label || 'this category';
            blogGrid.innerHTML = `
                <div style="text-align: center; padding: var(--space-2xl);">
                    <p style="font-size: var(--text-lg); margin-bottom: var(--space-md); color: var(--color-gray-600);">
                        No posts found in ${activeLabel}.
                    </p>
                    <p style="font-size: var(--text-sm); color: var(--color-gray-500);">
                        Try another category or check back soon.
                    </p>
                </div>
            `;
            return;
        }

        blogGrid.innerHTML = filteredPosts.map(post => {
            const emoji = post.metadata?.emoji || '💙';
            const date = formatDate(post.metadata?.date);
            const category = post.metadata?.category || 'Mental Health';
            const categorySlug = getCategorySlug(category);
            const slug = post.slug || post.metadata?.slug || (post.name ? post.name.replace('.md', '') : '');

            if (!slug) {
            warnDebug('Skipped blog post without slug.', post);
                return '';
            }
            
            return `
                <article class="blog-card fade-in" data-post-id="${slug}" data-category="${categorySlug}">
                    <div class="blog-card-image" style="font-size: var(--text-5xl);">${emoji}</div>
                    <div class="blog-card-content">
                        <div class="blog-card-date">${date} • ${category}</div>
                        <h3>${post.metadata?.title || 'Untitled Post'}</h3>
                        <p>${post.metadata?.summary || ''}</p>
                        <a href="/blog/${encodeURIComponent(slug)}" class="blog-card-link">Read More →</a>
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
    }

    function setActiveCategory(blogGrid, activeSlug, shouldUpdateUrl) {
        const resolvedSlug = categoryOptions.some((option) => option.slug === activeSlug) ? activeSlug : 'all';
        activeCategorySlug = resolvedSlug;
        updateCategoryNav(activeCategorySlug);
        if (shouldUpdateUrl) {
            updateCategoryUrl(activeCategorySlug);
        }
        renderPostsForCategory(blogGrid, activeCategorySlug);
    }

    // Load and render blog posts
    async function loadBlogPosts() {
        const blogGrid = document.getElementById('blogGrid');
        if (!blogGrid) {
            warnDebug('Blog grid element #blogGrid not found');
            return;
        }

        // Show loading state
        blogGrid.innerHTML = '<div style="text-align: center; padding: var(--space-2xl); color: var(--color-gray-600);">Loading blog posts...</div>';

        try {
            logDebug('Fetching blog posts from GitHub...');
            
            // Get list of posts from GitHub
            const posts = await blogAPI.listPosts();
            
            logDebug(`Received ${posts.length} post(s) from GitHub`);
            
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
            logDebug('Loading content for posts...');
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
                        warnDebug(`Failed to load post ${post.slug}:`, error);
                        return {
                            ...post,
                            metadata: {
                                title: post.slug ? post.slug.replace(/-/g, ' ') : 'Untitled Post',
                                date: new Date().toISOString(),
                                category: 'Mental Health',
                                summary: ''
                            },
                            body: '',
                            html: ''
                        };
                    }
                })
            );

            // Filter out failed loads
            const validPosts = postsWithContent
                .filter(result => result.status === 'fulfilled' && result.value !== null)
                .map(result => result.value);

            logDebug(`Successfully loaded ${validPosts.length} post(s)`);

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
                                       background: var(--gradient-primary); 
                                       color: var(--color-white); 
                                       border: none; 
                                       border-radius: var(--radius-lg); 
                                       font-weight: 600; 
                                       cursor: pointer;
                                       font-size: var(--text-base);">
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
            cachedPosts = validPosts;

            const derivedCategories = buildCategoryOptionsFromPosts(validPosts);
            const defaultCategories = window.BloomlyBlog?.getDefaultBlogCategories?.() || [];
            categoryOptions = (window.BloomlyBlog?.renderBlogCategoryPanel({
                categories: [...defaultCategories, ...derivedCategories],
                activeSlug: window.BloomlyBlog?.getBlogCategoryFromUrl?.() || 'all',
                baseUrl: '/blog'
            }) || {}).categories || derivedCategories;

            activeCategorySlug = window.BloomlyBlog?.getBlogCategoryFromUrl?.() || 'all';
            setActiveCategory(blogGrid, activeCategorySlug, false);

            const nav = document.querySelector('[data-blog-category-panel]');
            if (nav) {
                nav.addEventListener('click', (event) => {
                    const link = event.target.closest('[data-category-slug]');
                    if (!link) return;
                    event.preventDefault();
                    const slug = link.dataset.categorySlug || 'all';
                    setActiveCategory(blogGrid, slug, true);
                });
            }

            window.addEventListener('popstate', () => {
                const slug = window.BloomlyBlog?.getBlogCategoryFromUrl?.() || 'all';
                setActiveCategory(blogGrid, slug, false);
            });

        } catch (error) {
            warnDebug('Error loading blog posts:', error);
            
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
                                   background: var(--gradient-primary); 
                                   color: var(--color-white); 
                                   border: none; 
                                   border-radius: var(--radius-lg); 
                                   font-weight: 600; 
                                   cursor: pointer;
                                   font-size: var(--text-base);">
                        🔄 Retry
                    </button>
                </div>
            `;
        }
    }

    // Manual refresh function
    window.refreshBlogPosts = function() {
        logDebug('Manual refresh triggered');
        loadBlogPosts();
    };

    // Initialize
    function init() {
        logDebug('Initializing blog loader...');
        loadBlogPosts();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
