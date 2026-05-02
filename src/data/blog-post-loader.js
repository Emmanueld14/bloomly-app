/**
 * Individual Blog Post Loader
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
        warnDebug('blogAPI not loaded! Make sure blog-api.js is loaded before blog-post-loader.js');
        const bodyEl = document.getElementById('articleBody');
        if (bodyEl) {
            bodyEl.innerHTML = '<p style="color: red;">Error: Blog API not loaded. Please refresh the page.</p>';
        }
        return;
    }

    // Shared slug helpers (reuse BloomlyBlog when available)
    const sharedBlog = window.BloomlyBlog || {};

    const normalizeBlogSlug = sharedBlog.normalizeBlogSlug || function normalizeBlogSlug(value) {
        if (!value) return null;
        let decoded = '';
        try {
            decoded = decodeURIComponent(String(value));
        } catch (error) {
            decoded = String(value);
        }
        const cleaned = decoded.trim().replace(/^\/+/, '').replace(/\/+$/, '').replace(/\.html$/, '');
        return cleaned || null;
    };

    const resolveBlogSlug = sharedBlog.resolveBlogSlug || function resolveBlogSlug() {
        const urlParams = new URLSearchParams(window.location.search);
        const slugParam = normalizeBlogSlug(urlParams.get('slug'));
        if (slugParam) return slugParam;

        const compatParam = normalizeBlogSlug(
            urlParams.get('id') || urlParams.get('post') || urlParams.get('postId') || urlParams.get('splat')
        );
        if (compatParam) return compatParam;

        const firstParam = normalizeBlogSlug(urlParams.values().next().value);
        if (firstParam) return firstParam;

        const firstKey = normalizeBlogSlug(urlParams.keys().next().value);
        if (firstKey) return firstKey;

        const path = window.location.pathname;
        const match = path.match(/\/blog\/([^\/?#]+)(?:\/|\.html)?$/);
        const normalizedPath = normalizeBlogSlug(match ? match[1] : null);
        if (normalizedPath) return normalizedPath;

        const hash = window.location.hash || '';
        const hashMatch = hash.match(/\/blog\/([^\/?#]+)(?:\/|\.html)?$/);
        const normalizedHash = normalizeBlogSlug(hashMatch ? hashMatch[1] : null);
        if (normalizedHash) return normalizedHash;

        const referrer = document.referrer || '';
        const refMatch = referrer.match(/\/blog\/([^\/?#]+)(?:\/|\.html)?$/);
        return normalizeBlogSlug(refMatch ? refMatch[1] : null);
    };

    if (!sharedBlog.normalizeBlogSlug || !sharedBlog.resolveBlogSlug) {
        window.BloomlyBlog = {
            ...sharedBlog,
            normalizeBlogSlug,
            resolveBlogSlug
        };
    }

    function setCanonicalUrl(slug) {
        const canonicalHref = slug
            ? `${window.location.origin}/blog/${encodeURIComponent(slug)}`
            : `${window.location.origin}/blog`;
        let canonicalEl = document.querySelector('link[rel="canonical"]');
        if (!canonicalEl) {
            canonicalEl = document.createElement('link');
            canonicalEl.rel = 'canonical';
            document.head.appendChild(canonicalEl);
        }
        canonicalEl.href = canonicalHref;
    }

    function setPostUnavailableState(isUnavailable) {
        const engagementSection = document.querySelector('.post-engagement');
        if (!engagementSection) return;
        if (isUnavailable) {
            engagementSection.setAttribute('hidden', '');
            engagementSection.setAttribute('aria-hidden', 'true');
        } else {
            engagementSection.removeAttribute('hidden');
            engagementSection.setAttribute('aria-hidden', 'false');
        }
    }

    function renderFallback({ title, message, showRetry } = {}) {
        const fallbackTitle = title || 'Post Not Found';
        const fallbackMessage = message || 'We could not find that post.';

        document.title = `${fallbackTitle} - Bloomly Blog`;

        let metaDesc = document.querySelector('meta[name="description"]');
        if (!metaDesc) {
            metaDesc = document.createElement('meta');
            metaDesc.name = 'description';
            document.head.appendChild(metaDesc);
        }
        metaDesc.content = fallbackMessage;

        const titleEl = document.getElementById('articleTitle');
        if (titleEl) {
            titleEl.textContent = fallbackTitle;
        }

        const metaEl = document.getElementById('articleMeta');
        if (metaEl) {
            metaEl.innerHTML = '';
        }

        const bodyEl = document.getElementById('articleBody');
        if (bodyEl) {
            const actions = showRetry
                ? `
                    <button type="button" class="btn btn-primary" data-retry-post>Try Again</button>
                    <a href="/blog" class="btn btn-secondary">Back to Blog</a>
                `
                : `
                    <a href="/blog" class="btn btn-primary">Back to Blog</a>
                    <a href="/index.html" class="btn btn-secondary">Go Home</a>
                `;

            bodyEl.innerHTML = `
                <div class="glass-card" style="padding: var(--space-2xl); text-align: center; max-width: 720px; margin: 0 auto;">
                    <h2 style="margin-bottom: var(--space-md);">${fallbackTitle}</h2>
                    <p style="margin-bottom: var(--space-lg); color: var(--color-gray-600);">
                        ${fallbackMessage}
                    </p>
                    <div style="display: flex; flex-wrap: wrap; gap: var(--space-md); justify-content: center;">
                        ${actions}
                    </div>
                </div>
            `;

            const retryButton = bodyEl.querySelector('[data-retry-post]');
            if (retryButton) {
                retryButton.addEventListener('click', () => window.location.reload());
            }
        }
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

    function getPostTitle(post, fallbackSlug) {
        return post?.metadata?.title || String(fallbackSlug || '').replace(/-/g, ' ') || 'Untitled Post';
    }

    function getPostPermalink(post) {
        const slug = post.slug || post.metadata?.slug || (post.name ? post.name.replace(/\.md$/, '') : '');
        return post.permalink || post.metadata?.permalink || `/blog-post?slug=${encodeURIComponent(slug)}`;
    }

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function createPostCard(post) {
        const title = escapeHtml(getPostTitle(post, post.slug));
        const category = escapeHtml(post.metadata?.category || 'Mental Health');
        const date = escapeHtml(formatDate(post.metadata?.date));
        const summary = escapeHtml(post.metadata?.summary || '');
        const emoji = escapeHtml(post.metadata?.emoji || '💙');
        const body = post.body || summary;
        const readTime = Math.max(1, Math.ceil(String(body || '').split(/\s+/).filter(Boolean).length / 200));
        return `
            <article class="blog-card related-post-card">
                <div class="blog-card-image" style="font-size: var(--text-5xl);">${emoji}</div>
                <div class="blog-card-content">
                    <div class="blog-card-date">${date} • ${readTime} min read • ${category}</div>
                    <h3>${title}</h3>
                    <p class="blog-card-excerpt excerpt">${summary}</p>
                    <a href="${getPostPermalink(post)}" class="blog-card-link">Read More →</a>
                </div>
            </article>
        `;
    }

    function updateReadingProgress() {
        const bar = document.querySelector('[data-reading-progress]');
        const article = document.getElementById('articleBody');
        if (!bar || !article) return;
        const rect = article.getBoundingClientRect();
        const scrollable = Math.max(1, rect.height - window.innerHeight + 160);
        const progress = Math.min(1, Math.max(0, (0 - rect.top + 120) / scrollable));
        bar.style.transform = `scaleX(${progress})`;
    }

    function initReadingProgress() {
        updateReadingProgress();
        window.addEventListener('scroll', updateReadingProgress, { passive: true });
        window.addEventListener('resize', updateReadingProgress);
    }

    function renderShareSection(postTitle) {
        const share = document.querySelector('[data-post-share]');
        if (!share) return;
        const pageUrl = window.location.href;
        const encodedTitle = encodeURIComponent(postTitle);
        const encodedUrl = encodeURIComponent(pageUrl);
        share.innerHTML = `
            <span>Share this:</span>
            <a class="share-pill" href="https://wa.me/?text=${encodedTitle}%20${encodedUrl}" target="_blank" rel="noopener noreferrer">Share on WhatsApp</a>
            <a class="share-pill" href="https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}" target="_blank" rel="noopener noreferrer">Share on X</a>
            <button type="button" class="share-pill" data-copy-link>Copy link</button>
        `;
        const copyButton = share.querySelector('[data-copy-link]');
        if (copyButton) {
            copyButton.addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(pageUrl);
                    copyButton.textContent = 'Copied!';
                    window.setTimeout(() => {
                        copyButton.textContent = 'Copy link';
                    }, 2000);
                } catch (error) {
                    copyButton.textContent = 'Copy failed';
                    window.setTimeout(() => {
                        copyButton.textContent = 'Copy link';
                    }, 2000);
                }
            });
        }
    }

    async function renderRelatedPosts(currentSlug, category) {
        const section = document.querySelector('[data-related-posts-section]');
        const grid = document.querySelector('[data-related-posts]');
        if (!section || !grid) return;
        try {
            const posts = await blogAPI.listPosts();
            const enriched = await Promise.all(posts.map(async (post) => {
                try {
                    const content = await blogAPI.getPost(post.slug);
                    return { ...post, ...content };
                } catch (error) {
                    return post;
                }
            }));
            const sameCategory = enriched.filter((post) =>
                post.slug !== currentSlug &&
                String(post.metadata?.category || '').toLowerCase() === String(category || '').toLowerCase()
            );
            const fallback = enriched.filter((post) => post.slug !== currentSlug);
            const related = (sameCategory.length ? sameCategory : fallback).slice(0, 3);
            if (!related.length) {
                section.hidden = true;
                return;
            }
            grid.innerHTML = related.map(createPostCard).join('');
            section.hidden = false;
        } catch (error) {
            section.hidden = true;
        }
    }

    function isBlogPostRoot() {
        const path = window.location.pathname.replace(/\/+$/, '');
        return path === '/blog-post' || path.endsWith('/blog-post/index.html') || path.endsWith('/blog-post.html');
    }

    function showBlogListFallback() {
        const listBlocks = document.querySelectorAll('[data-blog-list-fallback]');
        if (!listBlocks.length) {
            return false;
        }

        listBlocks.forEach((block) => {
            block.removeAttribute('hidden');
        });

        const postWrapper = document.querySelector('.post');
        if (postWrapper) {
            postWrapper.setAttribute('hidden', '');
            postWrapper.setAttribute('aria-hidden', 'true');
        }

        return true;
    }

    // Load and render the post
    async function loadPost() {
        const slug = (window.BloomlyBlog?.resolveBlogSlug || resolveBlogSlug)();
        if (!slug) {
            document.body.dataset.postSlugMissing = 'true';
            document.body.dataset.postUnavailable = 'true';
            setCanonicalUrl(null);
            setPostUnavailableState(true);
            if (isBlogPostRoot() && showBlogListFallback()) {
                document.title = 'Blog - Bloomly';
                return;
            }
            renderFallback({
                title: 'Post Not Found',
                message: 'We could not find that post. Please return to the blog.'
            });
            return;
        }

        delete document.body.dataset.postSlugMissing;
        delete document.body.dataset.postUnavailable;
        setCanonicalUrl(slug);
        setPostUnavailableState(false);

        // Keep post wrapper in sync for modular interactions
        const postWrapper = document.querySelector('.post');
        if (postWrapper) {
            postWrapper.setAttribute('data-post-id', slug);
        }
        const interactionBlock = document.querySelector('[data-post-interactions]');
        if (interactionBlock) {
            interactionBlock.setAttribute('data-post-id', slug);
        }

        try {
            logDebug(`Loading post: ${slug}`);
            
            // Load from GitHub API (single source of truth)
            const post = await blogAPI.getPost(slug);
            const html = blogAPI.markdownToHTML(post.body);

            // Update page title
            const postTitle = post.metadata?.title || slug.replace(/-/g, ' ');
            const postAuthor = String(post.metadata?.author || '').trim();
            const titleEl = document.getElementById('articleTitle');
            if (titleEl) {
                titleEl.textContent = postTitle;
            }
            document.title = `${postTitle} - Bloomly Blog`;

            // Update meta description
            let metaDesc = document.querySelector('meta[name="description"]');
            if (!metaDesc) {
                metaDesc = document.createElement('meta');
                metaDesc.name = 'description';
                document.head.appendChild(metaDesc);
            }
            metaDesc.content = post.metadata?.summary || '';

            // Keep author available for UI and sharing modules.
            document.body.dataset.postAuthor = postAuthor || 'Bloomly Team';

            let authorMeta = document.querySelector('meta[name="author"]');
            if (!authorMeta) {
                authorMeta = document.createElement('meta');
                authorMeta.name = 'author';
                document.head.appendChild(authorMeta);
            }
            authorMeta.content = postAuthor || 'Bloomly Team';

            let articleAuthorMeta = document.querySelector('meta[property="article:author"]');
            if (!articleAuthorMeta) {
                articleAuthorMeta = document.createElement('meta');
                articleAuthorMeta.setAttribute('property', 'article:author');
                document.head.appendChild(articleAuthorMeta);
            }
            articleAuthorMeta.setAttribute('content', postAuthor || 'Bloomly Team');

            const canonicalUrl = `${window.location.origin}/blog-post?slug=${encodeURIComponent(slug)}`;

            const ogFields = [
                ['og:title', postTitle],
                ['og:description', post.metadata?.summary || 'Read this post on Bloomly.'],
                ['og:url', canonicalUrl],
                ['og:type', 'article'],
                ['og:site_name', 'Bloomly']
            ];
            ogFields.forEach(([property, value]) => {
                let meta = document.querySelector(`meta[property="${property}"]`);
                if (!meta) {
                    meta = document.createElement('meta');
                    meta.setAttribute('property', property);
                    document.head.appendChild(meta);
                }
                meta.setAttribute('content', String(value || ''));
            });

            const twitterFields = [
                ['twitter:card', 'summary_large_image'],
                ['twitter:title', postTitle],
                ['twitter:description', post.metadata?.summary || 'Read this post on Bloomly.']
            ];
            twitterFields.forEach(([name, value]) => {
                let meta = document.querySelector(`meta[name="${name}"]`);
                if (!meta) {
                    meta = document.createElement('meta');
                    meta.name = name;
                    document.head.appendChild(meta);
                }
                meta.content = String(value || '');
            });

            // Format date
            const dateStr = formatDate(post.metadata?.date);
            const category = post.metadata?.category || 'Mental Health';
            const wordCount = post.body.split(' ').length;
            const readTime = Math.ceil(wordCount / 200);
            const categorySlug = window.BloomlyBlog?.normalizeCategory
                ? window.BloomlyBlog.normalizeCategory(category)
                : category.toLowerCase().replace(/\s+/g, '-');

            if (window.BloomlyBlog?.renderBlogCategoryPanel) {
                const defaults = window.BloomlyBlog.getDefaultBlogCategories?.() || [];
                const hasCategory = defaults.some((item) => {
                    const slugValue = window.BloomlyBlog.normalizeCategory(item.label || item.slug || '');
                    return slugValue === categorySlug;
                });
                const categories = hasCategory
                    ? defaults
                    : [...defaults, { label: category, slug: categorySlug }];

                window.BloomlyBlog.renderBlogCategoryPanel({
                    categories,
                    activeSlug: categorySlug,
                    baseUrl: '/blog'
                });
            }

            // Update meta info
            const metaEl = document.getElementById('articleMeta');
            if (metaEl) {
                const authorSegment = postAuthor ? `<span>•</span><span>${postAuthor}</span>` : '';
                metaEl.innerHTML = `
                    <span>${dateStr}</span>
                    <span>•</span>
                    <span>${category}</span>
                    <span>•</span>
                    <span>${readTime} min read</span>
                    ${authorSegment}
                `;
            }

            // Render body
            const bodyEl = document.getElementById('articleBody');
            if (bodyEl) {
                bodyEl.innerHTML = html;

                // Add featured image if available
                if (post.metadata?.featuredImage) {
                    const img = document.createElement('img');
                    img.src = post.metadata.featuredImage;
                    img.alt = postTitle;
                    img.style.cssText = 'width: 100%; border-radius: var(--radius-xl); margin-bottom: var(--space-xl);';
                    bodyEl.insertBefore(img, bodyEl.firstChild);
                }

            }

            renderShareSection(postTitle);
            renderAuthorCard(postAuthor);
            void renderRelatedPosts(slug, category);
            initReadingProgress();

            logDebug(`Post loaded successfully: ${slug}`);

        } catch (error) {
            warnDebug('Error loading post:', error);
            setPostUnavailableState(true);
            renderFallback({
                title: 'Post Not Found',
                message: 'We could not load this post right now. Please return to the blog.',
                showRetry: true
            });
        }
    }

    // Initialize
    function init() {
        logDebug('Initializing blog post loader...');
        loadPost();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
