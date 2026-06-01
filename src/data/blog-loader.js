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
        const blogGrid = document.getElementById('blogGrid');
        if (blogGrid) {
            blogGrid.innerHTML = `
                <div style="text-align: center; padding: var(--space-2xl); color: var(--color-gray-600);">
                    <p style="font-size: var(--text-lg); margin-bottom: var(--space-md);">Couldn't load posts</p>
                    <p style="font-size: var(--text-sm);">Please refresh the page or try again in a moment.</p>
                </div>
            `;
        }
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

    async function fetchLegacyPosts() {
        try {
            const response = await fetch('/content/blog/legacy.json', { cache: 'default' });
            if (!response.ok) {
                throw new Error(`Legacy posts unavailable: ${response.status}`);
            }
            const data = await response.json();
            if (!Array.isArray(data)) return [];
            return data.map(normalizeLegacyPost).filter(Boolean);
        } catch (error) {
            warnDebug('Unable to load legacy blog posts:', error);
            return [];
        }
    }

    function normalizeLegacyPost(entry) {
        const slug = String(entry?.slug || '').trim();
        if (!slug) return null;

        return {
            slug,
            name: `${slug}.html`,
            permalink: entry.permalink || (typeof blogAPI !== 'undefined' && blogAPI.postPermalink
                ? blogAPI.postPermalink(slug)
                : `/blog-post/?slug=${encodeURIComponent(slug)}`),
            metadata: {
                title: entry.title || 'Untitled Post',
                date: entry.date || '',
                category: entry.category || 'Mental Health',
                summary: entry.summary || '',
                emoji: entry.emoji || '💙'
            },
            body: '',
            html: ''
        };
    }


    function mergePosts(primaryPosts, legacyPosts) {
        const merged = new Map();

        primaryPosts.forEach((post) => {
            const slug = normalizePostSlug(post.slug || post.metadata?.slug || (post.name ? post.name.replace('.md', '') : ''));
            if (!slug) return;
            merged.set(slug, { ...post, slug });
        });

        legacyPosts.forEach((post) => {
            const slug = normalizePostSlug(post.slug || post.metadata?.slug || (post.name ? post.name.replace('.md', '') : ''));
            if (!slug || merged.has(slug)) return;
            merged.set(slug, { ...post, slug });
        });

        return Array.from(merged.values());
    }

    function isPublishedPost(post) {
        const value = String(post?.metadata?.published ?? post?.published ?? 'true').trim().toLowerCase();
        return value !== 'false' && value !== 'draft' && value !== '0';
    }

    let cachedPosts = [];
    let activeCategorySlug = 'all';
    let categoryOptions = [];
    let activeSearchQuery = '';
    let visiblePostCount = 6;
    let blogListInitialized = false;

    function shouldLoadBlogList() {
        const blogGrid = document.getElementById('blogGrid');
        if (!blogGrid) return false;

        const path = window.location.pathname.replace(/\/+$/, '') || '/';
        const isBlogIndex =
            path === '/blog' ||
            path.endsWith('/blog/index.html') ||
            path.endsWith('/blog.html');
        const isBlogPostRoot =
            path === '/blog-post' ||
            path.endsWith('/blog-post/index.html') ||
            path.endsWith('/blog-post.html');

        if (isBlogIndex) return true;
        if (!isBlogPostRoot) return false;

        const slug = window.BloomlyBlog?.resolveBlogSlug?.();
        return !slug;
    }

    function renderBlogLoadError(blogGrid, detail) {
        blogGrid.innerHTML = `
            <div style="text-align: center; padding: var(--space-2xl); color: var(--color-gray-600);">
                <p style="font-size: var(--text-lg); margin-bottom: var(--space-md);">Couldn't load posts</p>
                <p style="font-size: var(--text-sm); color: var(--color-gray-500); margin-bottom: var(--space-lg);">
                    ${detail || 'Please refresh the page or try again in a moment.'}
                </p>
                <button type="button" class="btn btn-primary" onclick="window.location.reload()">Try again</button>
            </div>
        `;
    }

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

    function normalizePostSlug(value) {
        if (window.BloomlyBlog && typeof window.BloomlyBlog.normalizeBlogSlug === 'function') {
            return window.BloomlyBlog.normalizeBlogSlug(value);
        }
        return String(value || '')
            .trim()
            .toLowerCase()
            .replace(/\.md$/, '')
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '');
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
        if (activeSearchQuery) {
            url.searchParams.set('search', activeSearchQuery);
        }
        window.history.pushState({ category: activeSlug }, '', url.toString());
    }

    function postMatchesSearch(post, query) {
        if (!query) return true;
        const haystack = [
            post.metadata?.title,
            post.metadata?.summary,
            post.metadata?.category
        ].join(' ').toLowerCase();
        return haystack.includes(query);
    }

    function renderPostsForCategory(blogGrid, activeSlug) {
        const loadMoreWrap = document.querySelector('[data-blog-load-more-wrap]');
        const loadMoreButton = document.querySelector('[data-blog-load-more]');
        const categoryFilteredPosts = activeSlug === 'all'
            ? cachedPosts
            : cachedPosts.filter((post) => getCategorySlug(post.metadata.category || '') === activeSlug);
        const filteredPosts = categoryFilteredPosts.filter((post) => postMatchesSearch(post, activeSearchQuery));

        if (!filteredPosts.length) {
            const activeLabel = categoryOptions.find((option) => option.slug === activeSlug)?.label || 'this category';
            const emptyTitle = activeSearchQuery
                ? `No posts found for "${activeSearchQuery}".`
                : `No posts found in ${activeLabel}.`;
            blogGrid.innerHTML = `
                <div style="text-align: center; padding: var(--space-2xl);">
                    <p style="font-size: var(--text-lg); margin-bottom: var(--space-md); color: var(--color-gray-600);">
                        ${emptyTitle}
                    </p>
                    <p style="font-size: var(--text-sm); color: var(--color-gray-500);">
                        Try another search, another category, or check back soon.
                    </p>
                </div>
            `;
            if (loadMoreWrap) loadMoreWrap.hidden = true;
            return;
        }

        const visiblePosts = filteredPosts.slice(0, visiblePostCount);
        blogGrid.innerHTML = visiblePosts.map(post => {
            const emoji = post.metadata?.emoji || '💙';
            const date = formatDate(post.metadata?.date);
            const category = post.metadata?.category || 'Mental Health';
            const categorySlug = getCategorySlug(category);
            const slug = normalizePostSlug(post.slug || post.metadata?.slug || (post.name ? post.name.replace('.md', '') : ''));
            const permalink = post.permalink
                || post.metadata?.permalink
                || (typeof blogAPI !== 'undefined' && blogAPI.postPermalink
                    ? blogAPI.postPermalink(slug)
                    : `/blog-post/?slug=${encodeURIComponent(slug)}`);

            if (!slug) {
                warnDebug('Skipped blog post without slug.', post);
                return '';
            }
            
            const readTime = post.metadata?.readTime
                || post.metadata?.read_time
                || post.metadata?.readingTime
                || post.metadata?.reading_time
                || '';
            const metaParts = [date, readTime].filter(Boolean).join(' • ');

            return `
                <article class="blog-card" data-post-id="${slug}" data-category="${categorySlug}">
                    <div class="blog-card-image" style="font-size: var(--text-5xl);">${emoji}</div>
                    <div class="blog-card-content">
                        <div class="blog-card-date">${metaParts} • ${category}</div>
                        <h3>${post.metadata?.title || 'Untitled Post'}</h3>
                        <p class="excerpt blog-card-excerpt">${post.metadata?.summary || ''}</p>
                        <a href="${permalink}" class="blog-card-link">Read More →</a>
                    </div>
                </article>
            `;
        }).join('');

        const hasMore = filteredPosts.length > visiblePostCount;
        if (loadMoreWrap) {
            loadMoreWrap.hidden = !hasMore;
        }
        if (loadMoreButton) {
            loadMoreButton.textContent = 'Load more';
            loadMoreButton.onclick = () => {
                visiblePostCount += 6;
                renderPostsForCategory(blogGrid, activeCategorySlug);
            };
        }
    }

    function setActiveCategory(blogGrid, activeSlug, shouldUpdateUrl) {
        const resolvedSlug = categoryOptions.some((option) => option.slug === activeSlug) ? activeSlug : 'all';
        activeCategorySlug = resolvedSlug;
        updateCategoryNav(activeCategorySlug);
        if (shouldUpdateUrl) {
            updateCategoryUrl(activeCategorySlug);
        }
        visiblePostCount = 6;
        renderPostsForCategory(blogGrid, activeCategorySlug);
    }

    // Load and render blog posts
    async function loadBlogPosts() {
        const blogGrid = document.getElementById('blogGrid');
        if (!blogGrid) {
            warnDebug('Blog grid element #blogGrid not found');
            return;
        }

        blogGrid.innerHTML = `
            <article class="blog-card blog-card-skeleton" aria-hidden="true"></article>
            <article class="blog-card blog-card-skeleton" aria-hidden="true"></article>
            <article class="blog-card blog-card-skeleton" aria-hidden="true"></article>
        `;

        try {
            console.info('[Bloomly Blog] Fetching published posts.');
            
            const [posts, legacyPosts] = await Promise.all([
                blogAPI.listPosts(),
                fetchLegacyPosts(),
            ]);
            
            console.info('[Bloomly Blog] Source counts', {
                markdown: posts.length,
                legacy: legacyPosts.length
            });
            
            if (posts.length === 0 && legacyPosts.length === 0) {
                blogGrid.innerHTML = `
                    <div style="text-align: center; padding: var(--space-2xl); color: var(--color-gray-600);">
                        <p style="font-size: var(--text-lg); margin-bottom: var(--space-md);">No blog posts found.</p>
                        <p style="font-size: var(--text-sm); color: var(--color-gray-500);">Posts will appear here once they are published.</p>
                    </div>
                `;
                return;
            }

            const validPosts = posts.filter((post) => post.metadata?.title);

            logDebug(`Successfully loaded ${validPosts.length} post(s)`);

            const mergedPosts = mergePosts(validPosts, legacyPosts);
            const finalPosts = mergedPosts.filter(isPublishedPost);
            console.info('[Bloomly Blog] Published posts ready', finalPosts.length);

            if (finalPosts.length === 0) {
                renderBlogLoadError(blogGrid, 'All posts failed to load. Please check your connection and try again.');
                return;
            }

            // Sort by date (newest first)
            finalPosts.sort((a, b) => {
                const dateA = new Date(a.metadata.date || 0);
                const dateB = new Date(b.metadata.date || 0);
                return dateB - dateA;
            });
            cachedPosts = finalPosts;

            const derivedCategories = buildCategoryOptionsFromPosts(finalPosts);
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

            const searchInput = document.querySelector('[data-blog-search]');
            if (searchInput && searchInput.dataset.blogSearchReady !== 'true') {
                searchInput.dataset.blogSearchReady = 'true';
                searchInput.addEventListener('input', () => {
                    activeSearchQuery = searchInput.value.trim().toLowerCase();
                    visiblePostCount = 6;
                    renderPostsForCategory(blogGrid, activeCategorySlug);
                });
            }

            window.addEventListener('popstate', () => {
                const slug = window.BloomlyBlog?.getBlogCategoryFromUrl?.() || 'all';
                setActiveCategory(blogGrid, slug, false);
            });

        } catch (error) {
            warnDebug('Error loading blog posts:', error);
            renderBlogLoadError(blogGrid, error.message || 'Please refresh the page or try again in a moment.');
        }
    }

    // Manual refresh function
    window.refreshBlogPosts = function() {
        logDebug('Manual refresh triggered');
        loadBlogPosts();
    };

    // Initialize
    function init() {
        if (blogListInitialized || !shouldLoadBlogList()) {
            return;
        }
        blogListInitialized = true;
        logDebug('Initializing blog loader...');
        loadBlogPosts();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
