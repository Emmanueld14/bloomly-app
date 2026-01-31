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

    const FALLBACK_POSTS = [
        {
            slug: 'built-different-and-proud-of-it',
            title: 'Built Different (And Proud of It)',
            date: '2026-01-24T10:22:00.000Z',
            category: 'Mental Health',
            summary: 'Have you ever felt like you don’t fit in no matter how hard you try? Honestly, it ain’t easy choosing to be different, choosing to be kind, choosing to be honest when everyone else is doing the opposite. This piece is me talking about what it’s like to go through hate, isolation, and being misunderstood at school just because I stayed true to myself. It’s about the pain, the growth, and learning to stand alone without losing who I am. And in the end, it’s really just a message to anyone out there who feels different: don’t give up on yourself — your light matters.',
            emoji: '🔥'
        },
        {
            slug: 'when-effort-turned-into-exhaustion',
            title: 'When Effort Turned Into Exhaustion',
            date: '2026-01-10T13:51:00.000Z',
            category: 'Mental Health',
            summary: 'This piece explores the quiet fear of feeling like you’ve lost your intelligence and the frustration that follows when effort doesn’t bring results.',
            emoji: '👓'
        },
        {
            slug: 'its-okay-to-reflect',
            title: 'It’s Okay to Reflect',
            date: '2026-01-05T07:33:00.000Z',
            category: 'Mental Health & Awareness',
            summary: 'At times, do you ever feel like isolating yourself from the world? Just taking a break and being you. When circumstances finally slap sense back into you, and all you want is to be alone.',
            emoji: '💫'
        },
        {
            slug: 'i-dont-know-anymore',
            title: 'I Don’t Know Anymore',
            date: '2026-01-04T01:51:00.000Z',
            category: 'Poetry',
            summary: 'Have you ever been in that position where things feel so heavy? Where everything you\'ve been working for seems to be crumbling down and it\'s all you by yourself, no one else? That feeling like your heart is about to pop off because it\'s too much to contain? That feeling of isolating yourself from the world? The feeling that you just wanna leave where you are and start a completely new chapter elsewhere? That feeling that as much you have someone around you you still feel so empty? You fee like it\'s just how it was before? No new changes?',
            emoji: '☹️'
        },
        {
            slug: 'is-it-really-the-phone-or-is-it-something-deeper',
            title: 'Is It Really That Phone? Or Is It Something Deeper',
            date: '2026-01-04T10:33:00.000Z',
            category: 'Self-Care',
            summary: 'Maybe you feel the same way I do. You’re the type who wants to make a change—you plan to make a change—but somehow you fall back into the same cycle again. Scroll, scroll, scroll… and scroll. Afterwards, guilt eats you up, and you hate yourself for it. But honestly, is it really the phone—or is it something you’ve never fully understood?',
            emoji: '🫶'
        },
        {
            slug: 'feel-like-giving-up-you-arent-alone',
            title: 'Feel Like Giving Up? You Aren’t Alone',
            date: '2026-01-02T04:07:00.000Z',
            category: 'Tips',
            summary: 'Does it feel like life is getting harder by the day, and the burden is too heavy to handle? You aren\'t alone. Let\'s talk more about it.',
            emoji: '💡'
        },
        {
            slug: 'do-you-still-feel-too-attached',
            title: 'Do You Still Feel Too Attached?',
            date: '2026-01-02T12:24:00.000Z',
            category: 'Mental Health',
            summary: 'Have you ever felt attached to someone so bad, and it seems you cant leave, let\'s talk more on that, shall we? ☺️',
            emoji: '🪴'
        },
        {
            slug: 'new-year-new-me',
            title: 'New Year, New me',
            date: '2025-12-31T02:18:00.000Z',
            category: 'New Year Resolutions',
            summary: 'What or how are new year, new me resolutions really supposed to look like? Immediate and direct? or slow but progressive? Let\'s find out more 😁',
            emoji: '❤️'
        },
        
    ];

    function buildFallbackPosts() {
        return FALLBACK_POSTS.map((post) => ({
            slug: post.slug,
            name: `${post.slug}.md`,
            permalink: `/blog/${post.slug}`,
            metadata: {
                title: post.title,
                date: post.date,
                category: post.category,
                summary: post.summary,
                emoji: post.emoji
            },
            body: '',
            html: ''
        }));
    }

    function cacheBustUrl(url) {
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}_t=${Date.now()}`;
    }

    function normalizeLegacyPost(entry) {
        const slug = String(entry?.slug || '').trim();
        if (!slug) return null;

        return {
            slug,
            name: `${slug}.html`,
            permalink: entry.permalink || `/blog/${slug}.html`,
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

    async function loadLegacyPosts() {
        try {
            const response = await fetch(cacheBustUrl('/content/blog/legacy.json'), {
                cache: 'no-store'
            });
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

    function mergePosts(primaryPosts, legacyPosts) {
        const merged = new Map();

        primaryPosts.forEach((post) => {
            const slug = post.slug || post.metadata?.slug || (post.name ? post.name.replace('.md', '') : '');
            if (!slug) return;
            merged.set(slug, { ...post, slug });
        });

        legacyPosts.forEach((post) => {
            const slug = post.slug || post.metadata?.slug || (post.name ? post.name.replace('.md', '') : '');
            if (!slug || merged.has(slug)) return;
            merged.set(slug, { ...post, slug });
        });

        return Array.from(merged.values());
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
            const permalink = post.permalink
                || post.metadata?.permalink
                || `/blog-post?slug=${encodeURIComponent(slug)}`;

            if (!slug) {
                warnDebug('Skipped blog post without slug.', post);
                return '';
            }
            
            return `
                <article class="blog-card post fade-in" data-post-id="${slug}" data-category="${categorySlug}">
                    <div class="blog-card-image" style="font-size: var(--text-5xl);">${emoji}</div>
                    <div class="blog-card-content">
                        <div class="blog-card-date">${date} • ${category}</div>
                        <h3>${post.metadata?.title || 'Untitled Post'}</h3>
                        <p>${post.metadata?.summary || ''}</p>
                        <a href="${permalink}" class="blog-card-link">Read More →</a>
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
            logDebug('Fetching blog posts...');
            
            // Get list of markdown posts and legacy HTML posts
            const posts = await blogAPI.listPosts();
            const legacyPosts = await loadLegacyPosts();
            
            logDebug(`Received ${posts.length} markdown post(s)`);
            logDebug(`Received ${legacyPosts.length} legacy post(s)`);
            
            if (posts.length === 0 && legacyPosts.length === 0) {
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

            const mergedPosts = mergePosts(validPosts, legacyPosts);
            const fallbackPosts = buildFallbackPosts();
            const finalPosts = mergePosts(mergedPosts, fallbackPosts);

            if (finalPosts.length === 0) {
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
