/**
 * Bloomly Website - Main JavaScript
 * Handles navigation, animations, and interactive features
 */

(function() {
    'use strict';

    // ========== Navigation ==========
    const navbar = document.getElementById('navbar');
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const navLinks = document.getElementById('navLinks');
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    let activeOverlayLocks = 0;

    function lockUiOverlay() {
        activeOverlayLocks += 1;
        document.body.classList.add('ui-overlay-open');
        document.documentElement.classList.add('ui-overlay-open');
    }

    function unlockUiOverlay() {
        activeOverlayLocks = Math.max(0, activeOverlayLocks - 1);
        if (activeOverlayLocks === 0) {
            document.body.classList.remove('ui-overlay-open');
            document.documentElement.classList.remove('ui-overlay-open');
        }
    }

    // Set active nav link based on current page
    function setActiveNavLink() {
        if (!navLinks) return;
        const links = navLinks.querySelectorAll('a');
        const path = window.location.pathname;
        const isBlogRoot = path === '/blog' || path === '/blog/';
        const isBlogPost = path.includes('/blog/') && !path.endsWith('blog.html') && !isBlogRoot;
        const isBlogPostTemplate = path.includes('/blog-post');
        const isTeamProfile = /\/(team|profile|people|members)(\/|$)/.test(path);
        const isSubscribePage = path.includes('/subscribe') || path.endsWith('subscribe.html');
        const isAppointmentsPage = path.includes('/appointments');
        
        links.forEach(link => {
            const linkPath = link.getAttribute('href') || '';
            const normalizedLinkPath = linkPath.split('?')[0];
            const linkSegment = normalizedLinkPath.split('/').pop();
            const isBlogLink = normalizedLinkPath.endsWith('blog.html') || normalizedLinkPath.endsWith('/blog');
            const isAboutLink = normalizedLinkPath.endsWith('about.html');
            const isSubscribeLink = normalizedLinkPath.endsWith('subscribe.html') || normalizedLinkPath.endsWith('/subscribe');
            const isAppointmentsLink = normalizedLinkPath.endsWith('/appointments') || normalizedLinkPath.endsWith('appointments.html');
            
            // Remove active class first
            link.classList.remove('active');
            
            // Check if this link should be active
            if (isTeamProfile && isAboutLink) {
                link.classList.add('active');
                return;
            }

            if (isSubscribePage && isSubscribeLink) {
                link.classList.add('active');
                return;
            }

            if (isAppointmentsPage && isAppointmentsLink) {
                link.classList.add('active');
                return;
            }

            if ((isBlogPost || isBlogPostTemplate || isBlogRoot) && isBlogLink) {
                link.classList.add('active');
            } else if (!isBlogPost && !isBlogPostTemplate && !isBlogRoot && !isTeamProfile && !isSubscribePage && !isAppointmentsPage) {
                if (linkSegment === currentPath || 
                    (currentPath === '' && linkSegment === 'index.html') ||
                    (currentPath === 'index.html' && linkSegment === 'index.html') ||
                    (path.endsWith('/') && linkSegment === 'index.html')) {
                    link.classList.add('active');
                }
            }
        });
    }

    // Navbar scroll effect
    function handleNavbarScroll() {
        if (navbar && window.scrollY > 20) {
            navbar.classList.add('scrolled');
        } else if (navbar) {
            navbar.classList.remove('scrolled');
        }
    }

    // Mobile menu toggle with smooth animations
    function toggleMobileMenu() {
        if (!navLinks || !mobileMenuToggle) return;
        const isCurrentlyOpen = navLinks.classList.contains('active');
        
        if (isCurrentlyOpen) {
            // Closing menu - reverse animation
            const menuItems = navLinks.querySelectorAll('li');
            menuItems.forEach((item, index) => {
                setTimeout(() => {
                    item.style.opacity = '0';
                    item.style.transform = 'translateX(-20px)';
                }, index * 50);
            });
            
            setTimeout(() => {
                navLinks.classList.remove('active');
                mobileMenuToggle.setAttribute('aria-expanded', 'false');
                document.body.classList.remove('menu-open');
            }, 300);
        } else {
            // Opening menu
            document.body.classList.add('menu-open');
            navLinks.classList.add('active');
            mobileMenuToggle.setAttribute('aria-expanded', 'true');
            
            // Staggered animation for menu items
            const menuItems = navLinks.querySelectorAll('li');
            menuItems.forEach((item, index) => {
                item.style.opacity = '0';
                item.style.transform = 'translateX(-20px)';
                setTimeout(() => {
                    item.style.opacity = '1';
                    item.style.transform = 'translateX(0)';
                }, 100 + (index * 80));
            });
        }
    }

    // Close mobile menu when clicking outside or on backdrop
    function closeMobileMenuOnClickOutside(event) {
        if (navLinks && navLinks.classList.contains('active')) {
            // Check if click is outside menu and toggle button
            const isClickOutside = !navLinks.contains(event.target) && 
                                  !mobileMenuToggle.contains(event.target);
            
            if (isClickOutside) {
                const menuItems = navLinks.querySelectorAll('li');
                menuItems.forEach((item, index) => {
                    setTimeout(() => {
                        item.style.opacity = '0';
                        item.style.transform = 'translateX(-20px)';
                    }, index * 50);
                });
                
                setTimeout(() => {
                    navLinks.classList.remove('active');
                    mobileMenuToggle.setAttribute('aria-expanded', 'false');
                    document.body.classList.remove('menu-open');
                }, 300);
            }
        }
    }

    // Close mobile menu when clicking a link
    function closeMobileMenuOnLinkClick() {
        if (!navLinks) return;
        const links = navLinks.querySelectorAll('a');
        links.forEach(link => {
            link.addEventListener('click', () => {
                const menuItems = navLinks.querySelectorAll('li');
                menuItems.forEach((item, index) => {
                    setTimeout(() => {
                        item.style.opacity = '0';
                        item.style.transform = 'translateX(-20px)';
                    }, index * 50);
                });
                
                setTimeout(() => {
                    navLinks.classList.remove('active');
                    mobileMenuToggle.setAttribute('aria-expanded', 'false');
                    document.body.classList.remove('menu-open');
                }, 200);
            });
        });
    }

    // ========== Scroll Animations ==========
    let fadeInObserver = null;

    function getFadeInObserver() {
        if (fadeInObserver || typeof window.IntersectionObserver !== 'function') {
            return fadeInObserver;
        }

        fadeInObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    fadeInObserver.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        return fadeInObserver;
    }

    function initScrollAnimations(scope = document) {
        const fadeElements = scope.querySelectorAll('.fade-in');
        if (!fadeElements.length) return;

        const observer = getFadeInObserver();
        fadeElements.forEach((element) => {
            if (element.dataset.fadeObserved === 'true') {
                return;
            }

            if (!observer) {
                element.classList.add('visible');
                element.dataset.fadeObserved = 'true';
                return;
            }

            observer.observe(element);
            element.dataset.fadeObserved = 'true';
        });
    }

    // ========== Smooth Scrolling ==========
    function initSmoothScrolling() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                const href = this.getAttribute('href');
                if (href !== '#' && href.startsWith('#')) {
                    e.preventDefault();
                    const target = document.querySelector(href);
                    if (target) {
                        const offsetTop = target.offsetTop - 80;
                        window.scrollTo({
                            top: offsetTop,
                            behavior: 'smooth'
                        });
                    }
                }
            });
        });
    }

    // ========== Blog Category Helpers ==========
    const BLOG_CATEGORY_DEFAULTS = [
        'All',
        'Mental Health',
        'Mental Health & Awareness',
        'Self-Care',
        'Tips',
        'New Year Resolutions',
        'Poetry'
    ];

    function normalizeCategory(value) {
        if (!value) return '';
        return value
            .toString()
            .trim()
            .toLowerCase()
            .replace(/&/g, 'and')
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');
    }

    const existingBloomlyBlog = window.BloomlyBlog || {};

    const normalizeBlogSlug = existingBloomlyBlog.normalizeBlogSlug || function normalizeBlogSlug(value) {
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

    const resolveBlogSlug = existingBloomlyBlog.resolveBlogSlug || function resolveBlogSlug() {
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

        const pathMatch = window.location.pathname.match(/\/blog\/([^\/?#]+)(?:\/|\.html)?$/);
        const pathSlug = normalizeBlogSlug(pathMatch ? pathMatch[1] : null);
        if (pathSlug) return pathSlug;

        const hashMatch = (window.location.hash || '').match(/\/blog\/([^\/?#]+)(?:\/|\.html)?$/);
        const hashSlug = normalizeBlogSlug(hashMatch ? hashMatch[1] : null);
        if (hashSlug) return hashSlug;

        const refMatch = (document.referrer || '').match(/\/blog\/([^\/?#]+)(?:\/|\.html)?$/);
        return normalizeBlogSlug(refMatch ? refMatch[1] : null);
    };

    function buildCategoryOptions(list) {
        const categories = Array.isArray(list) ? list : [];
        const seen = new Set();
        const results = [];

        categories.forEach((item) => {
            const label = typeof item === 'string' ? item : item?.label;
            if (!label) return;
            const slug = typeof item === 'string'
                ? normalizeCategory(label)
                : normalizeCategory(item.slug || item.label);
            if (!slug || seen.has(slug)) return;
            seen.add(slug);
            results.push({ label, slug });
        });

        return results;
    }

    function getDefaultBlogCategories() {
        return buildCategoryOptions(BLOG_CATEGORY_DEFAULTS);
    }

    function getBlogCategoryFromUrl() {
        const params = new URLSearchParams(window.location.search);
        const value = params.get('category');
        return value ? normalizeCategory(value) : 'all';
    }

    function renderBlogCategoryPanel({ categories, activeSlug, baseUrl } = {}) {
        const panels = document.querySelectorAll('[data-blog-category-panel]');
        if (!panels.length) return null;

        const base = baseUrl || '/blog';
        const categoryList = buildCategoryOptions(categories);
        const active = activeSlug || 'all';

        panels.forEach((panel) => {
            panel.innerHTML = '';
            const fragment = document.createDocumentFragment();
            categoryList.forEach((category) => {
                const link = document.createElement('a');
                link.className = 'blog-category-pill';
                link.textContent = category.label;
                link.dataset.categorySlug = category.slug;
                link.href = category.slug === 'all'
                    ? base
                    : `${base}?category=${encodeURIComponent(category.slug)}`;
                if (category.slug === active) {
                    link.classList.add('is-active');
                }
                fragment.appendChild(link);
            });
            panel.appendChild(fragment);
        });

        return { categories: categoryList, active };
    }

    window.BloomlyBlog = {
        ...existingBloomlyBlog,
        normalizeCategory,
        getDefaultBlogCategories,
        getBlogCategoryFromUrl,
        renderBlogCategoryPanel,
        normalizeBlogSlug,
        resolveBlogSlug
    };

    // ========== Button Hover Effects ==========
    function initButtonEffects() {
        const buttons = document.querySelectorAll('.btn');
        buttons.forEach(btn => {
            btn.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-2px)';
            });
            
            btn.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0)';
            });
        });
    }

    // ========== Card Hover Effects ==========
    function initCardEffects() {
        const cards = document.querySelectorAll('.card, .blog-card, .glass-card, .writing-card, .why-card');
        cards.forEach(card => {
            card.addEventListener('mouseenter', function() {
                this.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
            });
        });
    }

    // ========== Floating Shapes Animation ==========
    function initFloatingShapes() {
        const shapes = document.querySelectorAll('.floating-shape');
        shapes.forEach((shape, index) => {
            shape.style.animationDelay = `${index * -2}s`;
        });
    }

    // ========== Home Parallax ==========
    function initHomeParallax() {
        const elements = Array.from(document.querySelectorAll('[data-parallax]'));
        if (!elements.length) return;

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) return;

        const supportsHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
        const state = {
            mouseX: 0,
            mouseY: 0,
            scrollY: 0
        };
        let rafId = null;

        const update = () => {
            rafId = null;
            elements.forEach((element) => {
                const depth = parseFloat(element.dataset.parallaxDepth || '12');
                const speed = parseFloat(element.dataset.parallaxSpeed || '0.06');
                const translateX = state.mouseX * depth;
                const translateY = state.mouseY * depth - state.scrollY * speed;
                element.style.transform = `translate3d(${translateX}px, ${translateY}px, 0)`;
            });
        };

        const requestUpdate = () => {
            if (rafId === null) {
                rafId = window.requestAnimationFrame(update);
            }
        };

        if (supportsHover) {
            window.addEventListener('mousemove', (event) => {
                state.mouseX = (event.clientX / window.innerWidth) - 0.5;
                state.mouseY = (event.clientY / window.innerHeight) - 0.5;
                requestUpdate();
            }, { passive: true });
        }

        window.addEventListener('scroll', () => {
            state.scrollY = window.scrollY || 0;
            requestUpdate();
        }, { passive: true });

        requestUpdate();
    }

    // ========== Why Bloomly Cards ==========
    function initWhyBloomlyCards() {
        const cards = Array.from(document.querySelectorAll('[data-why-card]'));
        if (!cards.length) return;

        const supportsHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
        if (supportsHover) return;

        const closeAll = () => {
            cards.forEach((card) => {
                card.classList.remove('is-revealed');
                card.setAttribute('aria-expanded', 'false');
            });
        };

        cards.forEach((card) => {
            card.setAttribute('aria-expanded', 'false');
            card.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                if (card.classList.contains('is-revealed')) {
                    card.classList.remove('is-revealed');
                    card.setAttribute('aria-expanded', 'false');
                } else {
                    closeAll();
                    card.classList.add('is-revealed');
                    card.setAttribute('aria-expanded', 'true');
                }
            });
        });

        document.addEventListener('click', (event) => {
            if (!event.target.closest('[data-why-card]')) {
                closeAll();
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                closeAll();
            }
        });
    }

    // ========== Global Bloomly Additions ==========
    function enhanceFooter() {
        document.querySelectorAll('.footer-section').forEach((section) => {
            const heading = section.querySelector('h4');
            if (!heading) return;
            const headingText = heading.textContent.trim().toLowerCase();

            if (headingText === 'bloomly' && !section.querySelector('.footer-socials')) {
                const socials = document.createElement('div');
                socials.className = 'footer-socials';
                socials.innerHTML = `
                    <a href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer" aria-label="Bloomly on Instagram">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7Zm5 3.5A4.5 4.5 0 1 1 12 16.5 4.5 4.5 0 0 1 12 7.5Zm0 2A2.5 2.5 0 1 0 12 14.5 2.5 2.5 0 0 0 12 9.5ZM17.8 6.7a1.1 1.1 0 1 1-1.1 1.1 1.1 1.1 0 0 1 1.1-1.1Z"/></svg>
                    </a>
                    <a href="https://www.tiktok.com/" target="_blank" rel="noopener noreferrer" aria-label="Bloomly on TikTok">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 3c.35 2.25 1.6 3.7 4 4.05V10c-1.45-.04-2.76-.48-4-1.34v6.45A5.88 5.88 0 1 1 10.12 9.2c.3 0 .59.02.88.07v3.15a2.82 2.82 0 1 0 1.95 2.69V3H16Z"/></svg>
                    </a>
                    <a href="https://twitter.com/" target="_blank" rel="noopener noreferrer" aria-label="Bloomly on X">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.2 3h3.1l-6.8 7.75L21.5 21h-6.27l-4.9-6.4L4.72 21H1.6l7.26-8.3L1.2 3h6.43l4.43 5.86L17.2 3Zm-1.1 16.2h1.72L6.68 4.7H4.84L16.1 19.2Z"/></svg>
                    </a>
                `;
                section.appendChild(socials);
            }

            if (headingText === 'quick links' && !Array.from(section.querySelectorAll('a')).some((link) => link.textContent.trim() === 'Charla')) {
                const charlaLink = document.createElement('a');
                charlaLink.href = '/appointments';
                charlaLink.textContent = 'Charla';
                const subscribeLink = Array.from(section.querySelectorAll('a')).find((link) => link.textContent.trim() === 'Subscribe');
                section.insertBefore(charlaLink, subscribeLink || null);
            }
        });
    }

    // ========== Local Storage Helpers ==========
    function safeStorageGet(key) {
        try {
            return window.localStorage.getItem(key);
        } catch (error) {
            return null;
        }
    }

    function safeStorageSet(key, value) {
        try {
            window.localStorage.setItem(key, value);
            return true;
        } catch (error) {
            return false;
        }
    }

    function safeJSONParse(value, fallback) {
        if (!value) return fallback;
        try {
            return JSON.parse(value);
        } catch (error) {
            return fallback;
        }
    }

    // ========== Supabase Setup ==========
    // Replace these placeholders with your Supabase project credentials.
    const SUPABASE_URL = 'https://xmhyjttyarskimsxcfhl.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_IOs-j6rgWuDnwrymIIUHxQ_wCTmcaMp';

    function createSupabaseClient() {
        // Supabase library is loaded via CDN in blog pages
        if (!window.supabase || typeof window.supabase.createClient !== 'function') {
            return null;
        }

        // Prevent accidental use before credentials are set
        if (SUPABASE_URL === 'SUPABASE_URL' || SUPABASE_ANON_KEY === 'SUPABASE_ANON_KEY') {
            console.warn('Supabase not configured. Replace SUPABASE_URL and SUPABASE_ANON_KEY.');
            return null;
        }

        return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }

    const supabaseClient = createSupabaseClient();

    // ========== Post Interactions (Likes + Comments) ==========
    function resolvePostId(container) {
        // Use explicit data-post-id if provided, otherwise derive from the URL
        const explicitId = container.getAttribute('data-post-id');
        if (explicitId && explicitId.trim()) {
            return explicitId.trim();
        }

        const parentPost = container.closest('.post[data-post-id]');
        if (parentPost) {
            const parentId = parentPost.getAttribute('data-post-id');
            if (parentId && parentId.trim()) {
                return parentId.trim();
            }
        }

        const sharedResolve = window.BloomlyBlog?.resolveBlogSlug || resolveBlogSlug;
        return sharedResolve ? sharedResolve() : null;
    }

    function formatTimestamp(isoString) {
        const date = new Date(isoString);
        if (Number.isNaN(date.getTime())) {
            return 'Just now';
        }
        return date.toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function setFormMessage(messageEl, text, type) {
        if (!messageEl) return;
        messageEl.textContent = text || '';
        messageEl.classList.remove('is-success', 'is-error');

        if (type === 'success') {
            messageEl.classList.add('is-success');
        }

        if (type === 'error') {
            messageEl.classList.add('is-error');
        }
    }

    function isSupabaseReady() {
        return Boolean(supabaseClient);
    }

    function subscribeToLikeUpdates(postId, onUpdate) {
        if (!isSupabaseReady() || typeof supabaseClient.channel !== 'function') {
            return null;
        }

        return supabaseClient
            .channel(`likes-${postId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'likes',
                    filter: `post_id=eq.${postId}`
                },
                (payload) => {
                    const newCount = payload?.new?.count;
                    if (typeof newCount === 'number') {
                        onUpdate(newCount);
                    }
                }
            )
            .subscribe();
    }

    async function fetchSupabaseLikeCount(postId) {
        if (!isSupabaseReady()) return null;

        const { data, error } = await supabaseClient
            .from('likes')
            .select('count')
            .eq('post_id', postId)
            .maybeSingle();

        if (error) {
            console.warn('Unable to load like count from Supabase.', error);
            return null;
        }

        if (data && typeof data.count === 'number') {
            return data.count;
        }

        return 0;
    }

    async function upsertSupabaseLikeCount(postId, count) {
        if (!isSupabaseReady()) return false;

        const { error } = await supabaseClient
            .from('likes')
            .upsert({ post_id: postId, count }, { onConflict: 'post_id' });

        if (error) {
            console.warn('Unable to save like count to Supabase.', error);
            return false;
        }

        return true;
    }

    async function fetchSupabaseComments(postId) {
        if (!isSupabaseReady()) return null;

        const { data, error } = await supabaseClient
            .from('comments')
            .select('*')
            .eq('post_id', postId)
            .order('timestamp', { ascending: false });

        if (error) {
            console.warn('Unable to load comments from Supabase.', error);
            return null;
        }

        return data || [];
    }

    async function insertSupabaseComment(postId, nickname, text) {
        if (!isSupabaseReady()) return null;

        const { data, error } = await supabaseClient
            .from('comments')
            .insert({ post_id: postId, nick: nickname || null, text })
            .select('*')
            .single();

        if (error) {
            console.warn('Unable to save comment to Supabase.', error);
            return null;
        }

        return data;
    }

    function getCommentAuthorName(comment) {
        return comment.nick || comment.nickname || comment.author || 'Anonymous';
    }

    function getCommentInitials(name) {
        const parts = String(name || 'A')
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2);
        if (!parts.length) return 'A';
        return parts.map((part) => part.charAt(0).toUpperCase()).join('');
    }

    function isReplyComment(comment) {
        return Boolean(
            comment?.parent_id ||
            comment?.parentId ||
            comment?.reply_to ||
            comment?.replyTo
        );
    }

    function renderComments(list, comments) {
        list.innerHTML = '';

        if (!comments.length) {
            const empty = document.createElement('p');
            empty.className = 'comment-empty';
            empty.textContent = 'No comments yet. Be the first to share.';
            list.appendChild(empty);
            return;
        }

        comments.forEach((comment, index) => {
            const item = document.createElement('div');
            item.className = 'comment-item';
            if (isReplyComment(comment)) {
                item.classList.add('is-reply');
            }
            if (index < 2) {
                item.classList.add('is-new');
            }

            const avatar = document.createElement('span');
            avatar.className = 'comment-avatar';
            const authorName = getCommentAuthorName(comment);
            avatar.textContent = getCommentInitials(authorName);

            const content = document.createElement('div');
            content.className = 'comment-content';

            const meta = document.createElement('div');
            meta.className = 'comment-meta';

            const author = document.createElement('span');
            author.className = 'comment-author';
            author.textContent = authorName;

            const time = document.createElement('span');
            time.className = 'comment-time';
            time.textContent = formatTimestamp(comment.timestamp);

            meta.appendChild(author);
            if (isReplyComment(comment)) {
                const replyLabel = document.createElement('span');
                replyLabel.className = 'comment-reply-label';
                replyLabel.textContent = 'Reply';
                meta.appendChild(replyLabel);
            }
            meta.appendChild(time);

            const text = document.createElement('p');
            text.className = 'comment-text';
            text.textContent = comment.text || '';

            content.appendChild(meta);
            content.appendChild(text);
            item.appendChild(avatar);
            item.appendChild(content);
            list.appendChild(item);
        });
    }

    async function initLikeButton(container, postId) {
        const likeButtons = Array.from(container.querySelectorAll('[data-like-button]'));
        const likeCountEls = Array.from(container.querySelectorAll('[data-like-count]'));
        if (!likeButtons.length || !likeCountEls.length) return;

        const likedKey = `bloomly:liked:${postId}`;
        const countKey = `bloomly:like-count:${postId}`;

        let likeCount = 0;
        const supabaseCount = await fetchSupabaseLikeCount(postId);

        if (typeof supabaseCount === 'number') {
            likeCount = supabaseCount;
        } else {
            likeCount = parseInt(safeStorageGet(countKey) || '0', 10);
            if (Number.isNaN(likeCount) || likeCount < 0) {
                likeCount = 0;
            }
        }

        let liked = safeStorageGet(likedKey) === 'true';
        const setBusyState = (isBusy) => {
            likeButtons.forEach((button) => {
                button.disabled = isBusy;
            });
        };

        const updateLikeUI = () => {
            likeCountEls.forEach((countEl) => {
                countEl.textContent = `${likeCount} like${likeCount === 1 ? '' : 's'}`;
            });

            likeButtons.forEach((button) => {
                const likeText = button.querySelector('.like-text');
                button.classList.toggle('liked', liked);
                button.setAttribute('aria-pressed', liked ? 'true' : 'false');
                button.disabled = liked;
                if (likeText) {
                    likeText.textContent = liked ? 'Liked' : 'Like';
                }
            });
        };

        updateLikeUI();

        subscribeToLikeUpdates(postId, (newCount) => {
            likeCount = newCount;
            updateLikeUI();
        });

        likeButtons.forEach((button) => {
            button.addEventListener('click', async () => {
                // Prevent multiple likes per browser by storing a flag
                if (liked) return;
                liked = true;
                likeCount += 1;
                safeStorageSet(likedKey, 'true');
                updateLikeUI();
                setBusyState(true);

                if (isSupabaseReady()) {
                    const saved = await upsertSupabaseLikeCount(postId, likeCount);
                    if (!saved) {
                        // Fallback to local storage if Supabase write fails
                        safeStorageSet(countKey, String(likeCount));
                    }
                } else {
                    safeStorageSet(countKey, String(likeCount));
                }

                setBusyState(false);
                updateLikeUI();
            });
        });
    }

    async function initComments(container, postId) {
        const form = container.querySelector('[data-comment-form]');
        const list = container.querySelector('[data-comment-list]');
        const messageEl = container.querySelector('[data-comment-message]');
        const commentPanel = container.querySelector('[data-comment-panel]');
        const commentPanelBody = container.querySelector('[data-comment-panel-body]');
        const drawerToggle = document.querySelector('[data-comment-drawer-toggle]');
        const drawerClose = container.querySelector('[data-comment-drawer-close]');
        const drawerOverlay = document.querySelector('[data-comment-drawer-overlay]');
        if (!form || !list) return;

        let isDrawerOpen = false;
        let drawerLocked = false;

        const setDrawerState = (open) => {
            const nextOpen = Boolean(open);
            if (nextOpen === isDrawerOpen) return;

            isDrawerOpen = nextOpen;
            document.body.classList.toggle('comment-drawer-open', nextOpen);

            if (commentPanel) {
                commentPanel.setAttribute('aria-hidden', nextOpen ? 'false' : 'true');
            }

            if (drawerOverlay) {
                if (nextOpen) {
                    drawerOverlay.hidden = false;
                } else {
                    drawerOverlay.hidden = true;
                }
            }

            if (drawerToggle) {
                drawerToggle.setAttribute('aria-expanded', nextOpen ? 'true' : 'false');
                drawerToggle.textContent = nextOpen ? 'Close comments' : 'Comments';
            }

            if (nextOpen && !drawerLocked) {
                lockUiOverlay();
                drawerLocked = true;
            } else if (!nextOpen && drawerLocked) {
                unlockUiOverlay();
                drawerLocked = false;
            }
        };

        if (drawerToggle && commentPanelBody) {
            if (!commentPanelBody.id) {
                commentPanelBody.id = `post-comments-panel-${postId}`;
            }
            drawerToggle.setAttribute('aria-controls', commentPanelBody.id);
            drawerToggle.addEventListener('click', (event) => {
                event.preventDefault();
                if (document.body.classList.contains('snippet-modal-open')) {
                    return;
                }
                setDrawerState(!isDrawerOpen);
            });
        }

        if (drawerClose) {
            drawerClose.addEventListener('click', () => {
                setDrawerState(false);
            });
        }

        if (drawerOverlay) {
            drawerOverlay.addEventListener('click', () => {
                setDrawerState(false);
            });
        }

        document.addEventListener('keydown', (event) => {
            if (event.key !== 'Escape') return;
            if (document.body.classList.contains('snippet-modal-open')) return;
            if (isDrawerOpen) {
                setDrawerState(false);
            }
        });

        const commentsKey = `bloomly:comments:${postId}`;
        let comments = [];
        const supabaseComments = await fetchSupabaseComments(postId);

        if (Array.isArray(supabaseComments)) {
            comments = supabaseComments;
        } else {
            comments = safeJSONParse(safeStorageGet(commentsKey), []);
            if (!Array.isArray(comments)) {
                comments = [];
            }
        }

        renderComments(list, comments);

        form.addEventListener('submit', async (event) => {
            event.preventDefault();

            const nicknameInput = form.querySelector('input[name="nickname"]');
            const commentInput = form.querySelector('textarea[name="comment"]');
            const nickname = nicknameInput ? nicknameInput.value.trim() : '';
            const text = commentInput ? commentInput.value.trim() : '';

            if (!text) {
                setFormMessage(messageEl, 'Please write a comment before submitting.', 'error');
                if (commentInput) {
                    commentInput.focus();
                }
                return;
            }

            if (isSupabaseReady()) {
                const savedComment = await insertSupabaseComment(postId, nickname, text);
                if (!savedComment) {
                    setFormMessage(messageEl, 'Unable to save comment. Please try again.', 'error');
                    return;
                }

                comments.unshift(savedComment);
                renderComments(list, comments);
                setFormMessage(messageEl, 'Thanks! Your comment is now public.', 'success');
            } else {
                const newComment = {
                    nick: nickname || 'Anonymous',
                    text,
                    timestamp: new Date().toISOString()
                };

                comments.unshift(newComment);
                safeStorageSet(commentsKey, JSON.stringify(comments));
                renderComments(list, comments);
                setFormMessage(messageEl, 'Thanks! Your comment is saved on this device.', 'success');
            }

            if (!isDrawerOpen) {
                setDrawerState(true);
            }

            if (commentInput) {
                commentInput.value = '';
            }
        });
    }

    async function initPostInteractions() {
        const postBlocks = Array.from(document.querySelectorAll('.post'));
        const interactionBlocks = postBlocks.length
            ? postBlocks
            : Array.from(document.querySelectorAll('[data-post-interactions]'));

        if (!interactionBlocks.length) return;

        if (document.body.dataset.postSlugMissing === 'true' || document.body.dataset.postUnavailable === 'true') {
            return;
        }

        for (const block of interactionBlocks) {
            const postId = resolvePostId(block);
            if (!postId) {
                continue;
            }

            // Store the resolved ID to keep multiple components consistent
            block.setAttribute('data-post-id', postId);
            await initLikeButton(block, postId);
            await initComments(block, postId);
        }
    }

    // ========== Blog Snippet Share ==========
    function getSnippetThemeConfig(theme) {
        const normalized = String(theme || 'gradient').toLowerCase();

        if (normalized === 'dark') {
            return {
                textColor: '#f5f7ff',
                metaColor: 'rgba(245, 247, 255, 0.88)',
                accentColor: 'rgba(166, 190, 255, 0.85)',
                backgroundPainter(ctx, width, height) {
                    const gradient = ctx.createLinearGradient(0, 0, width, height);
                    gradient.addColorStop(0, '#111827');
                    gradient.addColorStop(0.5, '#1f2937');
                    gradient.addColorStop(1, '#3b425a');
                    ctx.fillStyle = gradient;
                    ctx.fillRect(0, 0, width, height);
                }
            };
        }

        if (normalized === 'pastel') {
            return {
                textColor: '#1f3158',
                metaColor: 'rgba(31, 49, 88, 0.82)',
                accentColor: 'rgba(168, 123, 255, 0.72)',
                backgroundPainter(ctx, width, height) {
                    const gradient = ctx.createLinearGradient(0, 0, width, height);
                    gradient.addColorStop(0, '#fdf2ff');
                    gradient.addColorStop(0.45, '#e6f2ff');
                    gradient.addColorStop(1, '#ffe4f2');
                    ctx.fillStyle = gradient;
                    ctx.fillRect(0, 0, width, height);
                }
            };
        }

        if (normalized === 'minimal') {
            return {
                textColor: '#1c2440',
                metaColor: 'rgba(28, 36, 64, 0.75)',
                accentColor: 'rgba(28, 36, 64, 0.3)',
                backgroundPainter(ctx, width, height) {
                    const gradient = ctx.createLinearGradient(0, 0, width, height);
                    gradient.addColorStop(0, '#ffffff');
                    gradient.addColorStop(0.55, '#f5f8ff');
                    gradient.addColorStop(1, '#eef2fb');
                    ctx.fillStyle = gradient;
                    ctx.fillRect(0, 0, width, height);
                }
            };
        }
        return {
            textColor: '#ffffff',
            metaColor: 'rgba(255, 255, 255, 0.9)',
            accentColor: 'rgba(255, 255, 255, 0.62)',
            backgroundPainter(ctx, width, height) {
                const gradient = ctx.createLinearGradient(0, 0, width, height);
                gradient.addColorStop(0, '#6d6af8');
                gradient.addColorStop(0.55, '#5ea8ff');
                gradient.addColorStop(1, '#ff7bb6');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, width, height);
            }
        };
    }

    function wrapCanvasText(ctx, text, maxWidth) {
        const words = String(text || '').split(/\s+/).filter(Boolean);
        const lines = [];
        let currentLine = '';

        words.forEach((word) => {
            const nextLine = currentLine ? `${currentLine} ${word}` : word;
            if (ctx.measureText(nextLine).width <= maxWidth) {
                currentLine = nextLine;
            } else {
                if (currentLine) {
                    lines.push(currentLine);
                }
                currentLine = word;
            }
        });

        if (currentLine) {
            lines.push(currentLine);
        }

        return lines;
    }

    function sanitizeSnippetText(text, maxLength = 320) {
        const normalized = String(text || '')
            .replace(/\s+/g, ' ')
            .trim();

        if (!normalized) return '';
        if (normalized.length <= maxLength) return normalized;

        return `${normalized.slice(0, maxLength - 1).trimEnd()}...`;
    }

    function renderSnippetCanvas(canvas, snippet, theme, articleTitle) {
        if (!canvas || typeof canvas.getContext !== 'function') return false;
        const context = canvas.getContext('2d');
        if (!context) return false;

        const width = Number(canvas.width || 1080);
        const height = Number(canvas.height || 1920);
        const padding = 110;
        const maxTextWidth = width - (padding * 2);
        const safeTitle = sanitizeSnippetText(articleTitle || 'Bloomly Blog', 78);
        const safeSnippet = sanitizeSnippetText(snippet, 360);
        const themeConfig = getSnippetThemeConfig(theme);

        themeConfig.backgroundPainter(context, width, height);

        context.save();
        context.globalAlpha = 0.22;
        context.fillStyle = '#ffffff';
        context.beginPath();
        context.arc(width - 120, 150, 170, 0, Math.PI * 2);
        context.fill();
        context.beginPath();
        context.arc(130, height - 130, 200, 0, Math.PI * 2);
        context.fill();
        context.restore();

        context.save();
        context.fillStyle = 'rgba(0, 0, 0, 0.13)';
        context.fillRect(56, 56, width - 112, height - 112);
        context.restore();

        context.save();
        context.fillStyle = themeConfig.textColor;
        context.globalAlpha = 0.95;
        context.font = '700 40px Poppins, Nunito, sans-serif';
        context.fillText('BLOOMLY SNIPPET', padding, 170);
        context.restore();

        context.save();
        context.fillStyle = themeConfig.accentColor;
        context.font = '700 220px Poppins, Nunito, sans-serif';
        context.fillText('“', padding - 18, 430);
        context.restore();

        let fontSize = 76;
        let lineHeight = 1.32;
        let lines = [];
        const maxLines = 11;
        while (fontSize >= 50) {
            context.font = `700 ${fontSize}px Poppins, Nunito, sans-serif`;
            lines = wrapCanvasText(context, safeSnippet, maxTextWidth);
            if (lines.length <= maxLines) {
                break;
            }
            fontSize -= 2;
            lineHeight = 1.3;
        }

        context.save();
        context.fillStyle = themeConfig.textColor;
        context.font = `700 ${fontSize}px Poppins, Nunito, sans-serif`;
        context.textBaseline = 'top';
        let textY = 445;
        const computedLineHeight = Math.round(fontSize * lineHeight);
        lines.forEach((line, index) => {
            if (index >= maxLines) return;
            context.fillText(line, padding, textY);
            textY += computedLineHeight;
        });
        context.restore();

        context.save();
        const authorSource = document.body?.dataset?.postAuthor || '';
        const authorLine = authorSource
            ? `By ${sanitizeSnippetText(authorSource, 60)}`
            : 'By Bloomly Team';
        context.fillStyle = themeConfig.metaColor;
        context.font = '600 38px Poppins, Nunito, sans-serif';
        context.fillText(`Bloomly Blog • ${safeTitle}`, padding, height - 248);
        context.font = '500 33px Poppins, Nunito, sans-serif';
        context.fillText(authorLine, padding, height - 198);
        context.font = '600 34px Poppins, Nunito, sans-serif';
        context.fillText('@bloomly', padding, height - 148);
        context.restore();

        return true;
    }

    function initSnippetShareCards() {
        // Spotify-style snippet sharing has been removed from the blog post experience.
        return;
        const articleBody = document.getElementById('articleBody');
        const articleTitle = document.getElementById('articleTitle');
        const articleAuthor = document.querySelector('[data-post-author]');
        const floatShare = document.querySelector('[data-snippet-float-share]');
        const modalOverlay = document.querySelector('[data-snippet-modal-overlay]');
        const modalClose = modalOverlay?.querySelector('[data-snippet-modal-close]');
        const previewCard = modalOverlay?.querySelector('[data-snippet-preview]');
        const previewText = modalOverlay?.querySelector('[data-snippet-preview-text]');
        const previewMeta = modalOverlay?.querySelector('[data-snippet-preview-meta]');
        const message = modalOverlay?.querySelector('[data-snippet-message]');
        const downloadButton = modalOverlay?.querySelector('[data-snippet-download]');
        const shareInstagram = modalOverlay?.querySelector('[data-snippet-share-instagram]');
        const shareWhatsApp = modalOverlay?.querySelector('[data-snippet-share-whatsapp]');
        const shareX = modalOverlay?.querySelector('[data-snippet-share-x]');
        const canvas = modalOverlay?.querySelector('[data-snippet-canvas]');
        const themeButtons = Array.from(modalOverlay?.querySelectorAll('[data-snippet-theme]') || []);

        if (!articleBody || !floatShare || !modalOverlay || !previewCard || !previewText || !downloadButton || !canvas || !themeButtons.length) {
            return;
        }

        let selectedSnippet = '';
        let activeTheme = 'gradient';
        let modalLocked = false;

        const defaultText = previewText.textContent || 'Select text from the article to preview it here.';

        function setMessage(text, tone = 'neutral') {
            if (!message) return;
            message.textContent = text || '';
            message.classList.remove('is-error', 'is-success');
            if (tone === 'error') message.classList.add('is-error');
            if (tone === 'success') message.classList.add('is-success');
        }

        function getShareCaption() {
            const titleText = sanitizeSnippetText(articleTitle?.textContent || 'Bloomly Blog', 88);
            return `"${selectedSnippet}" — ${titleText} | Bloomly`;
        }

        function updatePreviewContent() {
            previewText.textContent = selectedSnippet || defaultText;
            const titleText = sanitizeSnippetText(articleTitle?.textContent || 'Bloomly Blog', 72);
            if (previewMeta) {
                const authorSource = document.body?.dataset?.postAuthor || 'Bloomly Team';
                previewMeta.textContent = `Bloomly Blog · ${titleText} · By ${sanitizeSnippetText(authorSource, 48)}`;
            }
        }

        function updateThemeUI() {
            previewCard.classList.remove('theme-gradient', 'theme-dark', 'theme-pastel', 'theme-minimal');
            previewCard.classList.add(`theme-${activeTheme}`);

            themeButtons.forEach((button) => {
                const theme = String(button.getAttribute('data-snippet-theme') || '');
                button.classList.toggle('is-active', theme === activeTheme);
            });
        }

        function hideFloatShare() {
            floatShare.classList.remove('is-visible');
            floatShare.hidden = true;
        }

        function showFloatShareAt(rangeRect) {
            if (!rangeRect) {
                hideFloatShare();
                return;
            }
            const horizontalPadding = 16;
            const top = Math.max(84, rangeRect.top + window.scrollY - 44);
            const preferredLeft = rangeRect.left + window.scrollX + (rangeRect.width / 2);
            const clampedLeft = Math.min(
                window.scrollX + window.innerWidth - horizontalPadding,
                Math.max(window.scrollX + horizontalPadding, preferredLeft)
            );

            floatShare.style.top = `${top}px`;
            floatShare.style.left = `${clampedLeft}px`;
            floatShare.hidden = false;
            window.requestAnimationFrame(() => {
                floatShare.classList.add('is-visible');
            });
        }

        function getSelectionFromArticle() {
            const selection = window.getSelection();
            if (!selection || selection.isCollapsed || !selection.rangeCount) {
                return { text: '', rect: null };
            }

            const range = selection.getRangeAt(0);
            const containerNode = range.commonAncestorContainer;
            const hostNode = containerNode.nodeType === Node.TEXT_NODE ? containerNode.parentNode : containerNode;

            if (!hostNode || !articleBody.contains(hostNode)) {
                return { text: '', rect: null };
            }

            const text = sanitizeSnippetText(selection.toString(), 320);
            if (!text) {
                return { text: '', rect: null };
            }

            return { text, rect: range.getBoundingClientRect() };
        }

        function syncSelectionShareButton() {
            if (document.body.classList.contains('snippet-modal-open')) return;
            const next = getSelectionFromArticle();
            if (!next.text) {
                hideFloatShare();
                return;
            }

            selectedSnippet = next.text;
            updatePreviewContent();
            showFloatShareAt(next.rect);
        }

        function openModal() {
            if (!selectedSnippet) {
                setMessage('Select text first to create a share card.', 'error');
                return;
            }
            modalOverlay.hidden = false;
            modalOverlay.setAttribute('aria-hidden', 'false');
            document.body.classList.add('snippet-modal-open');
            window.requestAnimationFrame(() => {
                modalOverlay.classList.add('is-open');
            });
            if (!modalLocked) {
                lockUiOverlay();
                modalLocked = true;
            }
            hideFloatShare();
        }

        function closeModal() {
            modalOverlay.classList.remove('is-open');
            modalOverlay.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('snippet-modal-open');
            window.setTimeout(() => {
                if (!modalOverlay.classList.contains('is-open')) {
                    modalOverlay.hidden = true;
                }
            }, 280);
            if (modalLocked) {
                unlockUiOverlay();
                modalLocked = false;
            }
        }

        function exportSnippetCard(onSuccess) {
            if (!selectedSnippet) {
                setMessage('Select a sentence or paragraph from the article first.', 'error');
                return;
            }

            const rendered = renderSnippetCanvas(
                canvas,
                selectedSnippet,
                activeTheme,
                articleTitle?.textContent || 'Bloomly Blog'
            );

            if (!rendered) {
                setMessage('Unable to generate share card on this browser.', 'error');
                return;
            }

            const filename = `bloomly-snippet-${activeTheme}-${Date.now()}.png`;

            if (typeof canvas.toBlob === 'function') {
                canvas.toBlob((blob) => {
                    if (!blob) {
                        setMessage('Unable to generate share image. Please try again.', 'error');
                        return;
                    }

                    if (typeof onSuccess === 'function') {
                        onSuccess({ blob, filename });
                        return;
                    }

                    const blobUrl = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = blobUrl;
                    link.download = filename;
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                    setTimeout(() => URL.revokeObjectURL(blobUrl), 1200);
                    setMessage('Share card downloaded. Post it to Instagram Stories or anywhere.', 'success');
                }, 'image/png');
                return;
            }

            try {
                const fallbackUrl = canvas.toDataURL('image/png');
                const link = document.createElement('a');
                link.href = fallbackUrl;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                link.remove();
                setMessage('Share card downloaded. Post it to Instagram Stories or anywhere.', 'success');
            } catch (error) {
                console.error('Snippet card export failed', error);
                setMessage('Unable to download right now. Please try again.', 'error');
            }
        }

        async function copyCaptionToClipboard(caption) {
            if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
                return false;
            }
            try {
                await navigator.clipboard.writeText(caption);
                return true;
            } catch (error) {
                return false;
            }
        }

        function openShareWindow(url) {
            window.open(url, '_blank', 'noopener,noreferrer,width=680,height=760');
        }

        function shareToX() {
            if (!selectedSnippet) {
                setMessage('Select text first to share.', 'error');
                return;
            }
            const caption = getShareCaption();
            const shareUrl = new URL('https://twitter.com/intent/tweet');
            shareUrl.searchParams.set('text', caption);
            shareUrl.searchParams.set('url', window.location.href);
            openShareWindow(shareUrl.toString());
            setMessage('Opened X share window.', 'success');
        }

        function shareToWhatsApp() {
            if (!selectedSnippet) {
                setMessage('Select text first to share.', 'error');
                return;
            }
            const caption = `${getShareCaption()} ${window.location.href}`;
            const shareUrl = new URL('https://wa.me/');
            shareUrl.searchParams.set('text', caption);
            openShareWindow(shareUrl.toString());
            setMessage('Opened WhatsApp share window.', 'success');
        }

        async function shareToInstagram() {
            if (!selectedSnippet) {
                setMessage('Select text first to share.', 'error');
                return;
            }
            exportSnippetCard(async () => {
                const copied = await copyCaptionToClipboard(getShareCaption());
                openShareWindow('https://www.instagram.com/');
                if (copied) {
                    setMessage('Card downloaded. Caption copied — paste it in Instagram.', 'success');
                } else {
                    setMessage('Card downloaded. Open Instagram and add your caption.', 'success');
                }
            });
        }

        floatShare.addEventListener('click', (event) => {
            event.preventDefault();
            openModal();
        });

        if (modalClose) {
            modalClose.addEventListener('click', closeModal);
        }

        modalOverlay.addEventListener('click', (event) => {
            if (event.target === modalOverlay) {
                closeModal();
            }
        });

        downloadButton.addEventListener('click', () => {
            exportSnippetCard();
        });

        if (shareInstagram) {
            shareInstagram.addEventListener('click', shareToInstagram);
        }
        if (shareWhatsApp) {
            shareWhatsApp.addEventListener('click', shareToWhatsApp);
        }
        if (shareX) {
            shareX.addEventListener('click', shareToX);
        }

        themeButtons.forEach((button) => {
            button.addEventListener('click', () => {
                const nextTheme = String(button.getAttribute('data-snippet-theme') || 'gradient');
                activeTheme = nextTheme;
                updateThemeUI();
                updatePreviewContent();
            });
        });

        document.addEventListener('selectionchange', () => {
            if (document.activeElement && /input|textarea/i.test(document.activeElement.tagName)) {
                return;
            }
            syncSelectionShareButton();
        });
        articleBody.addEventListener('mouseup', () => window.requestAnimationFrame(syncSelectionShareButton));
        articleBody.addEventListener('keyup', () => window.requestAnimationFrame(syncSelectionShareButton));
        articleBody.addEventListener('touchend', () => window.setTimeout(syncSelectionShareButton, 20));

        window.addEventListener('scroll', hideFloatShare, { passive: true });
        window.addEventListener('resize', hideFloatShare);

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && modalOverlay.classList.contains('is-open')) {
                closeModal();
            }
        });

        updateThemeUI();
        updatePreviewContent();
    }

    // ========== Newsletter Signup ==========
    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function isSupabaseFunctionsReady() {
        return Boolean(
            supabaseClient &&
            supabaseClient.functions &&
            typeof supabaseClient.functions.invoke === 'function'
        );
    }

    function parseFunctionError(error) {
        if (!error) return null;

        const context = error.context || {};
        let payload = context.body;
        let payloadObject = null;

        if (payload && typeof payload === 'string') {
            try {
                payloadObject = JSON.parse(payload);
            } catch (parseError) {
                payloadObject = null;
            }
        } else if (payload && typeof payload === 'object') {
            payloadObject = payload;
        }

        return {
            status: context.status,
            message: payloadObject?.error || payloadObject?.message || error.message,
            payload: payloadObject,
            original: error
        };
    }

    function resolveNewsletterErrorMessage(errorInfo) {
        if (!errorInfo) {
            return 'Subscription failed. Please try again.';
        }

        const message = String(errorInfo.message || '').toLowerCase();

        if (errorInfo.status === 400 && message.includes('email')) {
            return 'Please enter a valid email address.';
        }

        if (message.includes('already') || message.includes('duplicate')) {
            return 'You are already subscribed.';
        }

        if (message.includes('network') || message.includes('fetch')) {
            return 'Network error. Please try again.';
        }

        if (errorInfo.status === 401 || errorInfo.status === 403) {
            return 'Subscription service is unavailable right now.';
        }

        return 'Subscription failed. Please try again.';
    }

    function isDuplicateDatabaseError(error) {
        const message = String(error?.message || '').toLowerCase();
        return error?.code === '23505' || message.includes('duplicate') || message.includes('unique');
    }

    function resolveDirectInsertErrorMessage(error) {
        if (!error) {
            return 'Subscription failed. Please try again.';
        }

        if (isDuplicateDatabaseError(error)) {
            return 'You are already subscribed.';
        }

        const message = String(error.message || '').toLowerCase();
        if (message.includes('row-level security') || message.includes('permission')) {
            return 'Subscription service is unavailable right now.';
        }

        if (message.includes('does not exist')) {
            return 'Subscription service is unavailable right now.';
        }

        return 'Subscription failed. Please try again.';
    }

    async function insertSubscriberDirect(email) {
        if (!isSupabaseReady()) {
            return { status: 'error', error: new Error('Supabase client unavailable') };
        }

        const { error } = await supabaseClient
            .from('subscribers')
            .insert({ email });

        if (error) {
            if (isDuplicateDatabaseError(error)) {
                return { status: 'already_subscribed' };
            }
            return { status: 'error', error };
        }

        return { status: 'subscribed' };
    }

    function setNewsletterLoading(form, button, isLoading) {
        if (button) {
            if (!button.dataset.defaultLabel) {
                button.dataset.defaultLabel = button.textContent || 'Subscribe';
            }
            button.textContent = isLoading ? 'Subscribing...' : button.dataset.defaultLabel;
            button.disabled = isLoading;
            button.classList.toggle('is-loading', isLoading);
        }

        if (form) {
            form.dataset.submitting = isLoading ? 'true' : 'false';
            form.setAttribute('aria-busy', isLoading ? 'true' : 'false');
        }
    }

    function initNewsletterForms() {
        const forms = document.querySelectorAll('[data-newsletter-form]');
        if (!forms.length) return;

        forms.forEach(form => {
            const emailInput = form.querySelector('input[name="email"]');
            const nameInput = form.querySelector('input[name="name"]');
            const messageEl = form.querySelector('[data-newsletter-message]');
            const submitButton = form.querySelector('button[type="submit"]');
            if (!emailInput) return;

            form.addEventListener('submit', async (event) => {
                event.preventDefault();

                if (form.dataset.submitting === 'true') {
                    return;
                }

                const email = emailInput.value.trim().toLowerCase();
                const name = nameInput ? nameInput.value.trim() : '';
                if (!isValidEmail(email)) {
                    setFormMessage(messageEl, 'Please enter a valid email address.', 'error');
                    emailInput.focus();
                    return;
                }

                setFormMessage(messageEl, '', null);
                setNewsletterLoading(form, submitButton, true);

                try {
                    if (isSupabaseFunctionsReady()) {
                        const { data, error } = await supabaseClient.functions.invoke(
                            'subscribe-newsletter',
                            { body: { email, name: name || null } }
                        );

                        if (error) {
                            const errorInfo = parseFunctionError(error);
                            console.error('Newsletter subscription failed', errorInfo);
                            if (isSupabaseReady()) {
                                const fallbackResult = await insertSubscriberDirect(email);
                                if (fallbackResult.status === 'subscribed') {
                                    setFormMessage(
                                        messageEl,
                                        'Thanks for subscribing! You are on the list.',
                                        'success'
                                    );
                                    return;
                                }

                                if (fallbackResult.status === 'already_subscribed') {
                                    setFormMessage(messageEl, 'You are already subscribed.', 'success');
                                    return;
                                }

                                if (fallbackResult.status === 'error') {
                                    console.error('Newsletter direct insert failed', fallbackResult.error);
                                    setFormMessage(
                                        messageEl,
                                        resolveDirectInsertErrorMessage(fallbackResult.error),
                                        'error'
                                    );
                                    return;
                                }
                            }

                            setFormMessage(messageEl, resolveNewsletterErrorMessage(errorInfo), 'error');
                            return;
                        }

                        if (!data || !data.status) {
                            console.error('Newsletter subscription returned no status', data);
                            setFormMessage(messageEl, 'Subscription failed. Please try again.', 'error');
                            return;
                        }

                        if (data.status === 'already_subscribed') {
                            setFormMessage(messageEl, 'You are already subscribed.', 'success');
                            return;
                        }

                        if (data.status !== 'subscribed') {
                            console.error('Unexpected newsletter response', data);
                            setFormMessage(messageEl, 'Subscription failed. Please try again.', 'error');
                            return;
                        }

                        const emailStatus = data.email_status || null;
                        if (emailStatus === 'failed') {
                            setFormMessage(
                                messageEl,
                                'You are subscribed, but we could not send a welcome email.',
                                'success'
                            );
                            return;
                        }

                        if (emailStatus === 'skipped') {
                            setFormMessage(messageEl, 'Thanks for subscribing! You are on the list.', 'success');
                            return;
                        }

                        setFormMessage(messageEl, 'Thanks for subscribing! Check your inbox.', 'success');
                    } else if (isSupabaseReady()) {
                        const fallbackResult = await insertSubscriberDirect(email);
                        if (fallbackResult.status === 'subscribed') {
                            setFormMessage(messageEl, 'Thanks for subscribing! You are on the list.', 'success');
                        } else if (fallbackResult.status === 'already_subscribed') {
                            setFormMessage(messageEl, 'You are already subscribed.', 'success');
                        } else if (fallbackResult.status === 'error') {
                            console.error('Newsletter direct insert failed', fallbackResult.error);
                            setFormMessage(
                                messageEl,
                                resolveDirectInsertErrorMessage(fallbackResult.error),
                                'error'
                            );
                        } else {
                            setFormMessage(messageEl, 'Subscription failed. Please try again.', 'error');
                        }
                    } else {
                        console.warn('Supabase not configured; saving locally.');
                        const storageKey = 'bloomly:newsletter-emails';
                        const stored = safeJSONParse(safeStorageGet(storageKey), []);
                        const emails = Array.isArray(stored) ? stored : [];
                        const alreadySubscribed = emails.includes(email);

                        if (!alreadySubscribed) {
                            emails.push(email);
                            safeStorageSet(storageKey, JSON.stringify(emails));
                        }

                        setFormMessage(
                            messageEl,
                            alreadySubscribed
                                ? 'We could not reach the signup service. Your email is saved on this device.'
                                : 'We could not reach the signup service. Your email is saved on this device.',
                            'error'
                        );
                    }

                    emailInput.value = '';
                    if (nameInput) {
                        nameInput.value = '';
                    }
                } catch (error) {
                    console.error('Newsletter subscription error', error);
                    setFormMessage(messageEl, 'Subscription failed. Please try again.', 'error');
                } finally {
                    setNewsletterLoading(form, submitButton, false);
                }
            });
        });
    }

    // ========== Bloomly Team Data ==========
    const BLOOMLY_TEAM_MEMBERS = [
        {
            id: 'manuel-muhunami',
            slug: 'manuel-muhunami',
            name: 'Manuel Muhunami',
            role: 'Founder & Lead Builder',
            image: '/images/team/manuel-muhunami-display-smooth-20260407.webp?v=1',
            accent: 'sage',
            details: [
                'Vision & Strategy',
                'Product Leadership',
                'Partnerships & Growth',
                'Innovation & Debate'
            ],
            panelSummary: 'Guides Bloomly\'s direction with care, clarity, and bold ideas.',
            summary: 'Builds Bloomly\'s vision and the systems that help teens feel seen.',
            story: `I used to think growing up would feel like becoming more certain.

Instead, it felt like losing pieces of myself I didn't even realize I needed.

High school wasn't what I expected. I thought it would be loud laughter, unbreakable friendships, and moments that would last forever. And for a while, it was. But somewhere along the way, things changed.

People changed.

Or maybe... they just became more of who they already were.

I remember sitting in a room full of people I once called my friends, and feeling completely alone. Conversations became quieter when I walked in. Jokes were made at my expense, disguised as "just playing." And the things that made me me - my voice, my reactions, my personality - slowly became things I started to question.

There's a specific kind of pain that comes with being rejected by people you never thought you'd lose.

Not a loud, dramatic pain.
But a quiet one.

The kind that makes you overthink everything.
The kind that makes you ask yourself, "Was it me?"

And for a long time, I thought it was.

I tried to adjust. To be less of a problem. Less expressive. Less noticeable. I thought if I could just become easier to accept, things would go back to how they were.

But they didn't.

And that's when I realized something uncomfortable:

Sometimes, people don't leave because you're not enough.
They leave because you're no longer willing to shrink yourself.

That realization didn't fix everything overnight. There were still days I felt angry. Days I felt misunderstood. Days I questioned my worth.

But slowly, something started to change.

I stopped trying to perform for people who had already decided who I was.

I started paying attention to the things that actually mattered to me - learning, growing, building something of my own, becoming someone I could be proud of.

I started accepting myself.

Not perfectly. Not all at once.
But honestly.

And that's something I wish more people understood:

You don't have to filter yourself to fit into someone else's idea of "acceptable."

Because the moment you do that, you don't just lose them -
you lose yourself.

I'm still learning. Still growing. Still figuring things out.

But if there's one thing I know now, it's this:

I want to live in a world where people don't feel the need to hide who they are just to belong.

And maybe I can't change the whole world.

But I can start by being honest about my own story.`,
            bio: 'Manuel builds Bloomly at the intersection of technology, writing, and debate.',
            work: {
                summary: 'Manuel shapes Bloomly\'s long-term vision and the partnerships that keep the community thriving.',
                highlights: [
                    'Sets the product roadmap and community values.',
                    'Builds partnerships with schools and youth advocates.',
                    'Keeps Bloomly rooted in empathy, safety, and belonging.'
                ]
            },
            values: [
                'Build systems that outlast hype.',
                'Curiosity before certainty.',
                'Teen voices should lead.',
                'Conversation creates empathy.',
                'Think long-term and ship responsibly.'
            ],
            links: [
                { label: 'LinkedIn', url: 'https://www.linkedin.com/in/manuel-muhunami' },
                { label: 'Portfolio', url: 'https://www.behance.net/manuel-muhunami' }
            ],
            skills: [
                'Leadership',
                'Vision Strategy',
                'Product Direction',
                'Community Building',
                'Partnership Growth'
            ],
            projects: [
                {
                    title: 'Bloomly Platform Blueprint',
                    description: 'A long-term roadmap that anchors Bloomly around teen-centered care.',
                    icon: '🗺️',
                    link: 'https://bloomly.co.ke'
                },
                {
                    title: 'Builder Notes',
                    description: 'Essays and reflections that connect technology, culture, and youth voice.',
                    icon: '📓'
                },
                {
                    title: 'Community Partnerships',
                    description: 'Collaborations with schools and youth groups to expand care and access.',
                    icon: '🤝'
                }
            ],
            extra: {
                highlights: [
                    'Founded Bloomly from a personal journaling practice.',
                    'Hosts monthly listening circles with teen advisors.',
                    'Believes every product decision should reduce stigma.'
                ],
                quote: 'Build with empathy first, then everything else follows.'
            }
        }
    ];
    // ========== Bloomly Team Cards ==========

    function resolveTeamProfileId(member) {
        if (!member || typeof member !== 'object') return null;
        return normalizeTeamSlug(member.id || member.slug || member.name);
    }

    function buildTeamProfileHref(member) {
        const profileId = resolveTeamProfileId(member);
        if (!profileId) {
            return '/members/';
        }
        return `/members/?id=${encodeURIComponent(profileId)}`;
    }

    function buildTeamCard(member, index = 0) {
        const wrapper = document.createElement('article');
        wrapper.className = 'bloomly-team-item';
        wrapper.dataset.teamCard = '';
        wrapper.dataset.accent = member.accent || 'sage';
        wrapper.dataset.slug = member.slug;

        const card = document.createElement('div');
        card.className = 'bloomly-team-card';

        const core = document.createElement('div');
        core.className = 'bloomly-team-core';

        const avatar = document.createElement('div');
        avatar.className = 'bloomly-team-avatar';

        const image = document.createElement('img');
        image.className = 'bloomly-team-photo';
        image.src = member.image || '/logo.svg';
        image.alt = `${member.name} portrait`;
        image.decoding = 'async';
        image.loading = index === 0 ? 'eager' : 'lazy';
        image.fetchPriority = index === 0 ? 'high' : 'auto';
        image.width = 520;
        image.height = 620;

        avatar.appendChild(image);

        const info = document.createElement('div');
        info.className = 'bloomly-team-info';

        const eyebrow = document.createElement('p');
        eyebrow.className = 'bloomly-team-eyebrow';
        eyebrow.textContent = 'Bloomly Team';

        const name = document.createElement('h3');
        name.className = 'bloomly-team-name';
        name.textContent = member.name;

        const role = document.createElement('p');
        role.className = 'bloomly-team-role';
        role.textContent = member.role;

        const summary = document.createElement('p');
        summary.className = 'bloomly-team-summary';
        summary.textContent = member.summary || member.panelSummary || '';

        const link = document.createElement('a');
        link.className = 'bloomly-team-link';
        link.href = buildTeamProfileHref(member);
        link.textContent = 'View Profile';

        info.append(eyebrow, name, role, summary);
        info.appendChild(link);
        core.append(avatar, info);
        card.appendChild(core);
        wrapper.appendChild(card);

        return wrapper;
    }

    function renderTeamGrid() {
        const grid = document.querySelector('[data-team-grid]');
        if (!grid) return;
        grid.innerHTML = '';
        const fragment = document.createDocumentFragment();
        BLOOMLY_TEAM_MEMBERS.forEach((member, index) => {
            fragment.appendChild(buildTeamCard(member, index));
        });
        grid.appendChild(fragment);
    }

    function initBloomlyTeamCards() {
        renderTeamGrid();
    }

    // ========== Team Profile Page ==========
    const TEAM_PROFILE_LOADING_DELAY = 180;

    function slugify(value) {
        return String(value || '')
            .trim()
            .toLowerCase()
            .replace(/['"]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    function normalizeTeamSlug(value) {
        if (!value) return null;
        let decoded = '';
        try {
            decoded = decodeURIComponent(String(value));
        } catch (error) {
            decoded = String(value);
        }
        const cleaned = decoded.trim().replace(/^\/+/, '').replace(/\/+$/, '').replace(/\.html$/, '');
        const slug = slugify(cleaned);
        return slug || null;
    }

    function resolveTeamSlug() {
        const params = new URLSearchParams(window.location.search);
        const slugParam = normalizeTeamSlug(
            params.get('slug') || params.get('id') || params.get('member') || params.get('profile')
        );
        if (slugParam) {
            return slugParam;
        }

        const pathMatch = window.location.pathname.match(/\/(team|profile|people|members)\/([^\/?#]+)(?:\.html)?\/?$/);
        const pathSlug = normalizeTeamSlug(pathMatch ? pathMatch[2] : null);
        if (pathSlug) {
            return pathSlug;
        }

        const hashMatch = (window.location.hash || '').match(/\/(team|profile|people|members)\/([^\/?#]+)(?:\.html)?\/?$/);
        return normalizeTeamSlug(hashMatch ? hashMatch[2] : null);
    }

    function findTeamMemberBySlug(slug) {
        if (!slug) return null;
        const normalized = normalizeTeamSlug(slug);
        if (!normalized) return null;
        return BLOOMLY_TEAM_MEMBERS.find((item) => {
            if (item.slug === normalized || item.id === normalized) {
                return true;
            }
            return slugify(item.name) === normalized;
        }) || null;
    }

    function syncProfileUrl(member) {
        const profileId = resolveTeamProfileId(member);
        if (!profileId || !window.history || typeof window.history.replaceState !== 'function') {
            return;
        }
        const currentParams = new URLSearchParams(window.location.search);
        const currentId = normalizeTeamSlug(currentParams.get('id'));
        const currentPath = window.location.pathname.replace(/\/+$/, '') || '/';
        const canonicalPath = '/members';
        if (currentPath !== canonicalPath || currentId !== profileId) {
            const targetPath = `/members/?id=${encodeURIComponent(profileId)}`;
            window.history.replaceState({}, '', targetPath);
        }
    }

    function fetchTeamMember(slug) {
        const normalized = normalizeTeamSlug(slug);
        return new Promise((resolve) => {
            window.setTimeout(() => {
                resolve(findTeamMemberBySlug(normalized));
            }, TEAM_PROFILE_LOADING_DELAY);
        });
    }

    function renderTeamProfileLoading(container) {
        if (!container) return;
        container.innerHTML = '';

        const section = document.createElement('section');
        section.className = 'team-profile-hero';

        const wrapper = document.createElement('div');
        wrapper.className = 'container';

        const card = document.createElement('div');
        card.className = 'glass-card team-profile-card team-profile-loading';
        card.setAttribute('role', 'status');
        card.setAttribute('aria-live', 'polite');

        const spinner = document.createElement('div');
        spinner.className = 'team-profile-spinner';
        spinner.setAttribute('aria-hidden', 'true');

        const message = document.createElement('p');
        message.textContent = 'Loading profile...';

        card.append(spinner, message);
        wrapper.appendChild(card);
        section.appendChild(wrapper);
        container.appendChild(section);
    }

    function renderTeamProfileNotFound(container) {
        container.innerHTML = '';
        const section = document.createElement('section');
        section.className = 'team-profile-hero';

        const wrapper = document.createElement('div');
        wrapper.className = 'container';

        const card = document.createElement('div');
        card.className = 'glass-card team-profile-card team-profile-notice';

        const message = document.createElement('p');
        message.textContent = 'We could not find this profile. Please return to the team page to meet the team.';

        const link = document.createElement('a');
        link.className = 'btn btn-primary';
        link.href = '/about.html';
        link.textContent = 'Back to Team Page';

        card.append(message, link);
        wrapper.appendChild(card);
        section.appendChild(wrapper);
        container.appendChild(section);
    }

    function getStoryParagraphs(member) {
        const storySource = member?.story || member?.bio || member?.summary || '';
        const rawParagraphs = Array.isArray(storySource)
            ? storySource
            : String(storySource).split(/\n{2,}/);

        return rawParagraphs
            .map((paragraph) => String(paragraph).trim())
            .filter(Boolean);
    }

    function renderProfileContactSection(member) {
        const section = document.createElement('section');
        section.className = 'section team-profile-contact profile-contact';

        const container = document.createElement('div');
        container.className = 'container';

        const card = document.createElement('div');
        card.className = 'team-profile-contact-card profile-contact-card';

        const title = document.createElement('h2');
        title.textContent = 'Return to Bloomly';

        const copy = document.createElement('p');
        copy.textContent = 'Explore the rest of the team or head back to the main site.';

        const actions = document.createElement('div');
        actions.className = 'team-profile-contact-actions';

        const returnLink = document.createElement('a');
        returnLink.className = 'btn btn-primary';
        returnLink.href = '/about.html';
        returnLink.textContent = 'Back to Team Page';
        actions.appendChild(returnLink);

        const homeLink = document.createElement('a');
        homeLink.className = 'btn btn-neutral';
        homeLink.href = '/index.html';
        homeLink.textContent = 'Bloomly Home';
        actions.appendChild(homeLink);

        if (Array.isArray(member.links) && member.links.length) {
            member.links.forEach((linkData) => {
                const link = document.createElement('a');
                link.className = 'btn btn-secondary';
                link.href = linkData.url;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                link.textContent = linkData.label;
                actions.appendChild(link);
            });
        }

        card.append(title, copy, actions);
        container.appendChild(card);
        section.appendChild(container);

        return section;
    }

    function renderSimpleProfileSection(member) {
        const section = document.createElement('section');
        section.className = 'section simple-profile-section';

        const container = document.createElement('div');
        container.className = 'container';

        const card = document.createElement('article');
        card.className = 'simple-profile-card';

        const backLink = document.createElement('a');
        backLink.className = 'simple-profile-back';
        backLink.href = '/about.html';
        backLink.textContent = 'Return to Team';

        const layout = document.createElement('div');
        layout.className = 'simple-profile-layout';

        const aside = document.createElement('figure');
        aside.className = 'simple-profile-aside';

        const image = document.createElement('img');
        image.className = 'simple-profile-image';
        image.src = member.image || '/logo.svg';
        image.alt = `${member.name} portrait`;
        image.decoding = 'async';
        image.fetchPriority = 'high';
        image.width = 520;
        image.height = 620;

        const caption = document.createElement('figcaption');
        caption.className = 'simple-profile-caption';
        caption.textContent = `${member.name} — ${member.role || 'Bloomly Team'}`;

        aside.append(image, caption);

        const content = document.createElement('div');
        content.className = 'simple-profile-content';

        const meta = document.createElement('p');
        meta.className = 'simple-profile-meta';
        meta.textContent = `${member.name} | ${member.role || 'Bloomly Team'}`;

        const title = document.createElement('h1');
        title.className = 'simple-profile-title';
        title.textContent = member.name;

        const story = document.createElement('div');
        story.className = 'simple-profile-story';
        const paragraphs = getStoryParagraphs(member);
        if (paragraphs.length) {
            paragraphs.forEach((text) => {
                const paragraph = document.createElement('p');
                paragraph.textContent = text;
                story.appendChild(paragraph);
            });
        } else {
            const paragraph = document.createElement('p');
            paragraph.textContent = member.bio || member.summary || '';
            story.appendChild(paragraph);
        }

        content.append(meta, title, story);
        layout.append(aside, content);
        card.append(backLink, layout);
        container.appendChild(card);
        section.appendChild(container);
        return section;
    }


    async function initTeamProfilePage() {
        const container = document.querySelector('[data-profile-page]') || document.querySelector('[data-team-profile]');
        if (!container) return;

        container.setAttribute('aria-busy', 'true');
        renderTeamProfileLoading(container);

        const slug = resolveTeamSlug();
        const member = await fetchTeamMember(slug);
        container.setAttribute('aria-busy', 'false');
        if (!member) {
            renderTeamProfileNotFound(container);
            return;
        }
        syncProfileUrl(member);
        document.title = `${member.name} | Bloomly`;

        container.innerHTML = '';
        const profileSection = renderSimpleProfileSection(member);
        container.append(profileSection);
    }

    // ========== Initialize Everything ==========
    function init() {
        // Navigation
        setActiveNavLink();
        handleNavbarScroll();
        
        if (mobileMenuToggle) {
            mobileMenuToggle.addEventListener('click', toggleMobileMenu);
        }
        
        closeMobileMenuOnLinkClick();
        document.addEventListener('click', closeMobileMenuOnClickOutside);
        
        // Scroll effects
        window.addEventListener('scroll', handleNavbarScroll);
        initScrollAnimations();
        initSmoothScrolling();
        
        // Interactive effects
        initButtonEffects();
        initCardEffects();
        initFloatingShapes();
        initHomeParallax();
        initWhyBloomlyCards();
        void initPostInteractions();
        initNewsletterForms();
        initBloomlyTeamCards();
        void initTeamProfilePage();
        enhanceFooter();
        
        // Trigger initial scroll check
        handleNavbarScroll();
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Handle page visibility for performance
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            // Pause any animations or heavy operations
        } else {
            // Resume operations
        }
    });

})();

