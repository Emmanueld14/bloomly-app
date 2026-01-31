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

    // Load and render the post
    async function loadPost() {
        const slug = (window.BloomlyBlog?.resolveBlogSlug || resolveBlogSlug)();
        if (!slug) {
            document.body.dataset.postSlugMissing = 'true';
            document.body.dataset.postUnavailable = 'true';
            setCanonicalUrl(null);
            setPostUnavailableState(true);
            renderFallback({
                title: 'Post Not Found',
                message: 'We could not find that post. Please return to the blog.'
            });
            return;
        }

        delete document.body.dataset.postSlugMissing;
        delete document.body.dataset.postUnavailable;

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

            // Format date
            const dateStr = formatDate(post.metadata.date);
            const category = post.metadata.category || 'Mental Health';
            const wordCount = post.body.split(' ').length;
            const readTime = Math.ceil(wordCount / 200);
            const categorySlug = window.BloomlyBlog?.normalizeCategory
                ? window.BloomlyBlog.normalizeCategory(category)
                : category.toLowerCase().replace(/\s+/g, '-');

            if (window.BloomlyBlog?.renderBlogCategoryPanel) {
                const defaults = window.BloomlyBlog.getDefaultBlogCategories?.() || [];
                const hasCategory = defaults.some((item) => {
                    const slug = window.BloomlyBlog.normalizeCategory(item.label || item.slug || '');
                    return slug === categorySlug;
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
                metaEl.innerHTML = `
                    <span>${dateStr}</span>
                    <span>•</span>
                    <span>${category}</span>
                    <span>•</span>
                    <span>${readTime} min read</span>
                `;
            }

            // Render body
            const bodyEl = document.getElementById('articleBody');
            if (bodyEl) {
                bodyEl.innerHTML = html;

                // Add featured image if available
                if (post.metadata.featuredImage) {
                    const img = document.createElement('img');
                    img.src = post.metadata.featuredImage;
                    img.alt = post.metadata.title;
                    img.style.cssText = 'width: 100%; border-radius: var(--radius-xl); margin-bottom: var(--space-xl);';
                    bodyEl.insertBefore(img, bodyEl.firstChild);
                }

                // Add CTA at the end
                const cta = document.createElement('div');
                cta.style.cssText = 'margin-top: var(--space-3xl); padding: var(--space-xl); background: rgba(var(--color-white-rgb), 0.8); border-radius: var(--radius-xl); text-align: center; border: 1px solid rgba(var(--color-black-rgb), 0.08);';
                cta.innerHTML = `
                    <h3 style="margin-bottom: var(--space-md);">Stay close to new reflections</h3>
                    <p style="margin-bottom: var(--space-lg);">Subscribe for calm updates and new stories as they land.</p>
                    <a href="/subscribe" class="btn btn-primary">Subscribe</a>
                `;
                bodyEl.appendChild(cta);
            }

            setCanonicalUrl(slug);
            setPostUnavailableState(false);
            logDebug(`Post loaded successfully: ${slug}`);

        } catch (error) {
            warnDebug('Error loading post:', error);
            document.body.dataset.postUnavailable = 'true';
            setCanonicalUrl(slug);
            setPostUnavailableState(true);
            renderFallback({
                title: 'Post Unavailable',
                message: 'We could not load this post right now. Please try again later.',
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
