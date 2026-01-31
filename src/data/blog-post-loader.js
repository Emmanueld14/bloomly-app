/**
 * Individual Blog Post Loader
 * Runtime-only fetching from GitHub API
 * NO caching, NO static files
 */

(function() {
    'use strict';

    const BLOG_DEBUG = window.localStorage && window.localStorage.getItem('bloomly:blog-debug') === 'true';
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

    // Get slug from URL
    function normalizeSlug(value) {
        if (!value) return null;
        const decoded = decodeURIComponent(String(value)).trim();
        const cleaned = decoded.replace(/^\/+/, '').replace(/\/+$/, '').replace(/\.html$/, '');
        return cleaned || null;
    }

    function getSlugFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const slugParam = urlParams.get('slug');
        const normalizedSlug = normalizeSlug(slugParam);
        if (normalizedSlug) return normalizedSlug;

        const compatParam = urlParams.get('id') || urlParams.get('post') || urlParams.get('postId') || urlParams.get('splat');
        const normalizedCompat = normalizeSlug(compatParam);
        if (normalizedCompat) return normalizedCompat;

        const firstParam = urlParams.values().next().value;
        const normalizedFirst = normalizeSlug(firstParam);
        if (normalizedFirst) return normalizedFirst;
        
        const path = window.location.pathname;
        const match = path.match(/\/blog\/([^\/?#]+)(?:\/|\.html)?$/);
        const normalizedPath = normalizeSlug(match ? match[1] : null);
        if (normalizedPath) return normalizedPath;

        const hash = window.location.hash || '';
        const hashMatch = hash.match(/\/blog\/([^\/?#]+)(?:\/|\.html)?$/);
        const normalizedHash = normalizeSlug(hashMatch ? hashMatch[1] : null);
        if (normalizedHash) return normalizedHash;

        const referrer = document.referrer || '';
        const refMatch = referrer.match(/\/blog\/([^\/?#]+)(?:\/|\.html)?$/);
        return normalizeSlug(refMatch ? refMatch[1] : null);
    }

    function renderNotFound() {
        const bodyEl = document.getElementById('articleBody');
        if (bodyEl) {
            bodyEl.innerHTML = `
                <div style="text-align: center; padding: var(--space-2xl);">
                    <p style="margin-bottom: var(--space-md); color: var(--color-gray-600);">
                        We could not find that post.
                    </p>
                    <a href="/blog" class="btn btn-primary">Back to Blog</a>
                </div>
            `;
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
        const slug = getSlugFromURL();
        if (!slug) {
            document.body.dataset.postSlugMissing = 'true';
            showError('We could not find that post. Please return to the blog.');
            renderNotFound();
            return;
        }

        // Keep post wrapper in sync for modular interactions
        const postWrapper = document.querySelector('.post');
        if (postWrapper) {
            postWrapper.setAttribute('data-post-id', slug);
        }

        try {
            logDebug(`Loading post: ${slug}`);
            
            // Load from GitHub API (single source of truth)
            const post = await blogAPI.getPost(slug);
            const html = blogAPI.markdownToHTML(post.body);

            // Update page title
            const titleEl = document.getElementById('articleTitle');
            if (titleEl) {
                titleEl.textContent = post.metadata.title;
            }
            document.title = `${post.metadata.title} - Bloomly Blog`;

            // Update meta description
            let metaDesc = document.querySelector('meta[name="description"]');
            if (!metaDesc) {
                metaDesc = document.createElement('meta');
                metaDesc.name = 'description';
                document.head.appendChild(metaDesc);
            }
            metaDesc.content = post.metadata.summary || '';

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

            logDebug(`Post loaded successfully: ${slug}`);

        } catch (error) {
            warnDebug('Error loading post:', error);
            showError('We could not load this post right now. Please return to the blog.');
        }
    }

    // Show error message
    function showError(message) {
        const titleEl = document.getElementById('articleTitle');
        const bodyEl = document.getElementById('articleBody');
        
        if (titleEl) {
            titleEl.textContent = 'Post Not Found';
        }
        
        if (bodyEl) {
            bodyEl.innerHTML = `
                <div style="text-align: center; padding: var(--space-2xl);">
                    <p style="margin-bottom: var(--space-md); color: var(--color-gray-600);">
                        ${message}
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
                    <p style="margin-top: var(--space-md);">
                        <a href="/blog" style="color: var(--color-blue); text-decoration: underline;">Return to blog</a>
                    </p>
                </div>
            `;
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
