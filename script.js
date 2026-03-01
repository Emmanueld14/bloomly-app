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
            .select('id, post_id, nick, text, timestamp')
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
            .select('id, post_id, nick, text, timestamp')
            .single();

        if (error) {
            console.warn('Unable to save comment to Supabase.', error);
            return null;
        }

        return data;
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

        comments.forEach(comment => {
            const item = document.createElement('div');
            item.className = 'comment-item';

            const meta = document.createElement('div');
            meta.className = 'comment-meta';

            const author = document.createElement('span');
            author.className = 'comment-author';
            author.textContent = comment.nick || comment.nickname || 'Anonymous';

            const time = document.createElement('span');
            time.className = 'comment-time';
            time.textContent = formatTimestamp(comment.timestamp);

            meta.appendChild(author);
            meta.appendChild(time);

            const text = document.createElement('p');
            text.className = 'comment-text';
            text.textContent = comment.text || '';

            item.appendChild(meta);
            item.appendChild(text);
            list.appendChild(item);
        });
    }

    async function initLikeButton(container, postId) {
        const likeButton = container.querySelector('[data-like-button]');
        const likeCountEl = container.querySelector('[data-like-count]');
        if (!likeButton || !likeCountEl) return;

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
        const likeText = likeButton.querySelector('.like-text');

        const updateLikeUI = () => {
            likeCountEl.textContent = `${likeCount} like${likeCount === 1 ? '' : 's'}`;
            likeButton.classList.toggle('liked', liked);
            likeButton.setAttribute('aria-pressed', liked ? 'true' : 'false');
            likeButton.disabled = liked;
            if (likeText) {
                likeText.textContent = liked ? 'Liked' : 'Like';
            }
        };

        updateLikeUI();

        subscribeToLikeUpdates(postId, (newCount) => {
            likeCount = newCount;
            updateLikeUI();
        });

        likeButton.addEventListener('click', async () => {
            // Prevent multiple likes per browser by storing a flag
            if (liked) return;
            liked = true;
            likeCount += 1;
            safeStorageSet(likedKey, 'true');
            updateLikeUI();

            if (isSupabaseReady()) {
                const saved = await upsertSupabaseLikeCount(postId, likeCount);
                if (!saved) {
                    // Fallback to local storage if Supabase write fails
                    safeStorageSet(countKey, String(likeCount));
                }
            } else {
                safeStorageSet(countKey, String(likeCount));
            }
        });
    }

    async function initComments(container, postId) {
        const form = container.querySelector('[data-comment-form]');
        const list = container.querySelector('[data-comment-list]');
        const messageEl = container.querySelector('[data-comment-message]');
        if (!form || !list) return;

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
            image: '/logo.svg',
            accent: 'sage',
            details: [
                'Vision & Strategy',
                'Product Leadership',
                'Partnerships & Growth',
                'Innovation & Debate'
            ],
            panelSummary: 'Guides Bloomly\'s direction with care, clarity, and bold ideas.',
            summary: 'Builds Bloomly\'s vision and the systems that help teens feel seen.',
            story: 'Manuel Muhunami is a Kenyan student builder driven by curiosity, systems thinking, and conversation. He works at the intersection of technology, writing, and debate - using code to build platforms, words to explore ideas, and dialogue to understand people. His projects are less about shipping fast and more about building things that last, things that think.\n\nManuel\'s journey started with questions about how systems work, why societies move the way they do, and how young people can meaningfully shape the future. Over time, that curiosity evolved into action - building digital spaces for reflection, learning, and community.\n\nHe believes teenagers should not wait to be ready to contribute. They should build, question, and lead in their own voice. This platform is part of that belief: a living experiment in thought, technology, and growth.\n\nWhen not coding or writing, Manuel is usually debating ideas, refining systems, or quietly observing how people interact with the world around them.',
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

    function buildTeamCard(member) {
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
        summary.textContent = member.panelSummary || member.summary || '';

        const chips = document.createElement('div');
        chips.className = 'bloomly-team-chips';
        (member.details || []).slice(0, 3).forEach((detail) => {
            const chip = document.createElement('span');
            chip.className = 'bloomly-team-chip';
            chip.textContent = detail;
            chips.appendChild(chip);
        });

        const link = document.createElement('a');
        link.className = 'bloomly-team-link';
        link.href = buildTeamProfileHref(member);
        link.textContent = 'View Profile';

        info.append(eyebrow, name, role, summary);
        if (chips.childElementCount > 0) {
            info.appendChild(chips);
        }
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
        BLOOMLY_TEAM_MEMBERS.forEach((member) => {
            fragment.appendChild(buildTeamCard(member));
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
        card.className = 'glass-card team-profile-card team-profile-notice fade-in';

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

    const FOUNDER_PROFILE_SLUG = 'manuel-muhunami';
    const FOUNDER_PULL_QUOTE = "Wherever you are, whatever you're going through, don't hate yourself.";
    const FOUNDER_STORY_TITLES = [
        'The spark',
        'Curiosity into action',
        'Building a living platform',
        'Leading with conversation'
    ];
    const FOUNDER_TEAM_STORIES = {};

    function isFounderProfile(member) {
        const slug = normalizeTeamSlug(member?.slug || member?.id || member?.name);
        return slug === FOUNDER_PROFILE_SLUG;
    }

    function getFounderCoreTeamMembers() {
        return [];
    }

    function renderFounderHeroSection(member) {
        const section = document.createElement('section');
        section.className = 'team-profile-hero founder-profile-hero';

        const container = document.createElement('div');
        container.className = 'container';

        const backLink = document.createElement('a');
        backLink.className = 'back-button';
        backLink.href = '/about.html';
        backLink.textContent = 'Return to Team';

        const card = document.createElement('article');
        card.className = 'glass-card team-profile-card founder-profile-card fade-in';
        card.dataset.accent = member.accent || 'sage';

        const shell = document.createElement('div');
        shell.className = 'founder-profile-shell';

        const portrait = document.createElement('figure');
        portrait.className = 'founder-profile-portrait';
        portrait.dataset.founderParallax = '';

        const image = document.createElement('img');
        image.className = 'team-profile-image founder-profile-image';
        image.src = member.image || '/logo.svg';
        image.alt = `${member.name} smiling portrait`;
        image.decoding = 'async';
        image.fetchPriority = 'high';
        image.width = 560;
        image.height = 560;

        const caption = document.createElement('figcaption');
        caption.className = 'founder-profile-caption';
        caption.textContent = 'Founder, student builder, and community listener';

        portrait.append(image, caption);

        const content = document.createElement('div');
        content.className = 'founder-profile-content';

        const eyebrow = document.createElement('p');
        eyebrow.className = 'team-profile-eyebrow';
        eyebrow.textContent = 'Meet the founder';

        const name = document.createElement('h1');
        name.className = 'team-profile-name founder-profile-name';
        name.textContent = member.name;

        const role = document.createElement('p');
        role.className = 'team-profile-role founder-profile-role';
        role.textContent = member.role;

        const lead = document.createElement('p');
        lead.className = 'founder-profile-lead';
        lead.textContent = 'Manuel is building Bloomly as a warm, practical space where teens can heal, reflect, and grow in community.';

        const quote = document.createElement('blockquote');
        quote.className = 'founder-profile-quote';
        quote.textContent = FOUNDER_PULL_QUOTE;

        const promise = document.createElement('p');
        promise.className = 'founder-profile-promise';
        promise.innerHTML = 'This mission is grounded in one promise: <span class="founder-emphasis">you don\'t have to face it alone.</span>';

        const jumpLinks = document.createElement('nav');
        jumpLinks.className = 'founder-profile-jump-links';
        jumpLinks.setAttribute('aria-label', 'Profile sections');

        const storyLink = document.createElement('a');
        storyLink.className = 'founder-profile-jump-link';
        storyLink.href = '#founding-story';
        storyLink.textContent = 'Read the founding story';

        const teamLink = document.createElement('a');
        teamLink.className = 'founder-profile-jump-link';
        teamLink.href = '#core-team';
        teamLink.textContent = 'Meet the core team';

        jumpLinks.append(storyLink, teamLink);

        content.append(eyebrow, name, role, lead, quote, promise, jumpLinks);
        shell.append(portrait, content);
        card.appendChild(shell);
        container.append(backLink, card);
        section.appendChild(container);

        return section;
    }

    function renderFounderStorySection(member) {
        const section = document.createElement('section');
        section.className = 'section founder-story-section';
        section.id = 'founding-story';

        const container = document.createElement('div');
        container.className = 'container';

        const card = document.createElement('article');
        card.className = 'glass-card founder-story-card fade-in';

        const title = document.createElement('h2');
        title.id = 'founding-story-title';
        title.className = 'founder-story-title';
        title.textContent = 'About Manuel';
        section.setAttribute('aria-labelledby', title.id);

        const intro = document.createElement('p');
        intro.className = 'founder-story-intro';
        intro.textContent = 'A personal builder story about curiosity, responsibility, and creating safer digital spaces for young people.';

        const supportLine = document.createElement('p');
        supportLine.className = 'founder-story-support';
        supportLine.innerHTML = 'Every section of Bloomly is designed to remind people that <span class="founder-emphasis">you don\'t have to face it alone.</span>';

        const storyFlow = document.createElement('div');
        storyFlow.className = 'founder-story-flow';

        const paragraphs = getStoryParagraphs(member);
        paragraphs.forEach((text, index) => {
            const step = document.createElement('article');
            step.className = 'founder-story-step fade-in';

            const marker = document.createElement('span');
            marker.className = 'founder-story-step-index';
            marker.textContent = String(index + 1).padStart(2, '0');
            marker.setAttribute('aria-hidden', 'true');

            const copy = document.createElement('div');
            copy.className = 'founder-story-step-copy';

            const heading = document.createElement('h3');
            heading.className = 'founder-story-step-title';
            heading.textContent = FOUNDER_STORY_TITLES[index] || `Chapter ${index + 1}`;

            const paragraph = document.createElement('p');
            paragraph.textContent = text;

            copy.append(heading, paragraph);
            step.append(marker, copy);
            storyFlow.appendChild(step);
        });

        if (!paragraphs.length) {
            const emptyState = document.createElement('p');
            emptyState.textContent = member.bio || member.summary || '';
            storyFlow.appendChild(emptyState);
        }

        card.append(title, intro, supportLine, storyFlow);
        container.appendChild(card);
        section.appendChild(container);
        return section;
    }

    function renderFounderTeamCard(member) {
        const founderStory = member.founderStory || {};
        const card = document.createElement('article');
        card.className = 'glass-card founder-team-card fade-in';
        card.dataset.accent = member.accent || 'sage';

        const top = document.createElement('div');
        top.className = 'founder-team-top';

        const avatar = document.createElement('div');
        avatar.className = 'founder-team-avatar-wrap';

        const image = document.createElement('img');
        image.className = 'founder-team-avatar';
        image.src = member.image || '/logo.svg';
        image.alt = `${member.name} portrait`;
        image.loading = 'lazy';
        image.decoding = 'async';
        image.width = 180;
        image.height = 180;
        avatar.appendChild(image);

        const intro = document.createElement('div');
        intro.className = 'founder-team-intro';

        const name = document.createElement('h3');
        name.className = 'founder-team-name';
        name.textContent = member.name;

        const role = document.createElement('p');
        role.className = 'founder-team-role';
        role.textContent = member.role;

        const headline = document.createElement('p');
        headline.className = 'founder-team-headline';
        headline.textContent = founderStory.headline || member.panelSummary || '';

        const cue = document.createElement('div');
        cue.className = 'founder-team-cue';
        cue.setAttribute('aria-hidden', 'true');
        (founderStory.cue || []).forEach((item) => {
            const cuePill = document.createElement('span');
            cuePill.className = 'founder-team-cue-pill';
            cuePill.textContent = item;
            cue.appendChild(cuePill);
        });

        intro.append(name, role, headline, cue);
        top.append(avatar, intro);

        const passionBlock = document.createElement('div');
        passionBlock.className = 'founder-team-story-block';
        const passionTitle = document.createElement('h4');
        passionTitle.textContent = 'Professional passion';
        const passionCopy = document.createElement('p');
        passionCopy.textContent = founderStory.passion || member.summary || member.bio || '';
        passionBlock.append(passionTitle, passionCopy);

        const humanBlock = document.createElement('div');
        humanBlock.className = 'founder-team-story-block';
        const humanTitle = document.createElement('h4');
        humanTitle.textContent = 'Human side';
        const humanCopy = document.createElement('p');
        humanCopy.textContent = founderStory.humanSide || member.bio || member.summary || '';
        humanBlock.append(humanTitle, humanCopy);

        const profileLink = document.createElement('a');
        profileLink.className = 'founder-team-link';
        profileLink.href = buildTeamProfileHref(member);
        profileLink.textContent = 'View full profile';

        card.append(top, passionBlock, humanBlock, profileLink);
        return card;
    }

    function renderFounderTeamSection() {
        const section = document.createElement('section');
        section.className = 'section founder-team-section';
        section.id = 'core-team';

        const container = document.createElement('div');
        container.className = 'container';

        const header = document.createElement('div');
        header.className = 'section-header founder-team-header fade-in';

        const title = document.createElement('h2');
        title.id = 'core-team-title';
        title.textContent = 'The Team';
        section.setAttribute('aria-labelledby', title.id);

        const subtitle = document.createElement('p');
        subtitle.textContent = 'The people around Manuel are trusted builders and storytellers who make Bloomly feel grounded, credible, and deeply human.';
        header.append(title, subtitle);

        const grid = document.createElement('div');
        grid.className = 'founder-team-grid';

        const teammates = getFounderCoreTeamMembers();
        if (!teammates.length) {
            const empty = document.createElement('p');
            empty.className = 'founder-team-empty';
            empty.textContent = 'Core team profiles are being updated.';
            grid.appendChild(empty);
        } else {
            teammates.forEach((member) => {
                grid.appendChild(renderFounderTeamCard(member));
            });
        }

        container.append(header, grid);
        section.appendChild(container);
        return section;
    }

    function initFounderHeroParallax() {
        const portrait = document.querySelector('[data-founder-parallax]');
        if (!portrait) return;

        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        if (reduceMotion.matches) {
            portrait.style.setProperty('--founder-parallax-y', '0px');
            return;
        }

        let frameId = null;
        const updateParallax = () => {
            const rect = portrait.getBoundingClientRect();
            const viewportHeight = window.innerHeight || 1;
            const distanceFromCenter = ((rect.top + (rect.height / 2)) - (viewportHeight / 2)) / viewportHeight;
            const offset = Math.max(-18, Math.min(18, distanceFromCenter * -34));
            portrait.style.setProperty('--founder-parallax-y', `${offset.toFixed(2)}px`);
            frameId = null;
        };

        const requestUpdate = () => {
            if (frameId !== null) return;
            frameId = window.requestAnimationFrame(updateParallax);
        };

        requestUpdate();
        window.addEventListener('scroll', requestUpdate, { passive: true });
        window.addEventListener('resize', requestUpdate);
    }

    function renderProfileStorySection(member) {
        const section = document.createElement('section');
        section.className = 'section team-profile-about profile-story';

        const container = document.createElement('div');
        container.className = 'container';

        const card = document.createElement('div');
        card.className = 'glass-card team-profile-about-card profile-story-card fade-in';

        const title = document.createElement('h2');
        title.textContent = 'Personal Story';
        title.id = `story-${member.slug}`;
        section.setAttribute('aria-labelledby', title.id);

        const storyBody = document.createElement('div');
        storyBody.className = 'profile-story-content';

        const paragraphs = getStoryParagraphs(member);
        paragraphs.forEach((text) => {
            const paragraph = document.createElement('p');
            paragraph.textContent = text;
            storyBody.appendChild(paragraph);
        });

        card.append(title, storyBody);
        container.appendChild(card);
        section.appendChild(container);

        return section;
    }

    function renderProfileWorkSection(member) {
        const section = document.createElement('section');
        section.className = 'section team-profile-work profile-work';

        const container = document.createElement('div');
        container.className = 'container';

        const card = document.createElement('div');
        card.className = 'glass-card team-profile-work-card profile-work-card fade-in';

        const title = document.createElement('h2');
        title.textContent = 'What They Are Working On';
        title.id = `work-${member.slug}`;
        section.setAttribute('aria-labelledby', title.id);

        const summary = document.createElement('p');
        summary.className = 'team-profile-work-copy';
        summary.textContent = member.work?.summary || member.summary || member.bio || '';

        const grid = document.createElement('div');
        grid.className = 'team-profile-work-grid';

        const highlights = Array.isArray(member.work?.highlights) && member.work.highlights.length
            ? member.work.highlights
            : (member.details || member.skills || []);

        if (highlights.length) {
            highlights.slice(0, 6).forEach((item) => {
                const workItem = document.createElement('div');
                workItem.className = 'team-profile-work-item';
                workItem.textContent = item;
                grid.appendChild(workItem);
            });
        } else {
            const workItem = document.createElement('div');
            workItem.className = 'team-profile-work-item';
            workItem.textContent = 'Bloomly initiatives, community care, and ongoing support.';
            grid.appendChild(workItem);
        }

        card.append(title, summary, grid);
        container.appendChild(card);
        section.appendChild(container);

        return section;
    }

    function renderProfileProjectsSection(member) {
        const projects = Array.isArray(member.projects)
            ? member.projects
            : (member.portfolio || []);

        const section = document.createElement('section');
        section.className = 'section team-profile-portfolio profile-projects';

        const container = document.createElement('div');
        container.className = 'container';

        const header = document.createElement('div');
        header.className = 'section-header';

        const title = document.createElement('h2');
        title.textContent = 'Projects & Contributions';
        title.id = `projects-${member.slug}`;
        section.setAttribute('aria-labelledby', title.id);

        const subtitle = document.createElement('p');
        subtitle.textContent = 'Writing, platforms, and collaborations that shape Bloomly.';
        header.append(title, subtitle);

        const grid = document.createElement('div');
        grid.className = 'team-profile-portfolio-grid';

        if (projects.length) {
            projects.forEach((item) => {
                const card = document.createElement('article');
                card.className = 'team-profile-portfolio-card';

                const icon = document.createElement('span');
                icon.className = 'team-profile-portfolio-icon';
                icon.textContent = item.icon || '✨';

                const projectTitle = document.createElement('h3');
                projectTitle.textContent = item.title || 'Project';

                const description = document.createElement('p');
                description.textContent = item.description || '';

                card.append(icon, projectTitle, description);

                if (item.link) {
                    const link = document.createElement('a');
                    link.className = 'team-profile-portfolio-link';
                    link.href = item.link;
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';
                    link.textContent = 'View work';
                    card.appendChild(link);
                }

                grid.appendChild(card);
            });
        } else {
            const empty = document.createElement('p');
            empty.className = 'profile-projects-empty';
            empty.textContent = 'More contributions are on the way.';
            grid.appendChild(empty);
        }

        container.append(header, grid);
        section.appendChild(container);

        return section;
    }

    function renderProfileValuesSection(member) {
        const values = Array.isArray(member.values) && member.values.length
            ? member.values
            : (member.extra?.highlights || member.skills || []);

        const section = document.createElement('section');
        section.className = 'section team-profile-skills profile-values';

        const container = document.createElement('div');
        container.className = 'container';

        const card = document.createElement('div');
        card.className = 'glass-card team-profile-skills-card profile-values-card fade-in';

        const title = document.createElement('h2');
        title.textContent = 'Values & Philosophy';
        title.id = `values-${member.slug}`;
        section.setAttribute('aria-labelledby', title.id);

        const list = document.createElement('div');
        list.className = 'team-profile-skill-list profile-values-list';

        values.forEach((value) => {
            const pill = document.createElement('span');
            pill.className = 'team-profile-skill profile-value';
            pill.textContent = value;
            list.appendChild(pill);
        });

        card.append(title, list);

        if (member.extra?.quote) {
            const quote = document.createElement('p');
            quote.className = 'profile-values-quote';
            quote.textContent = member.extra.quote;
            card.appendChild(quote);
        }

        container.appendChild(card);
        section.appendChild(container);

        return section;
    }

    function renderProfileContactSection(member) {
        const section = document.createElement('section');
        section.className = 'section team-profile-contact profile-contact';

        const container = document.createElement('div');
        container.className = 'container';

        const card = document.createElement('div');
        card.className = 'glass-card team-profile-contact-card profile-contact-card fade-in';

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

    function renderCleanProfileHero(member) {
        const section = document.createElement('section');
        section.className = 'team-profile-hero team-profile-hero--clean';

        const container = document.createElement('div');
        container.className = 'container';

        const backLink = document.createElement('a');
        backLink.className = 'back-button';
        backLink.href = '/about.html';
        backLink.textContent = 'Return to Team';

        const card = document.createElement('article');
        card.className = 'glass-card team-profile-card team-profile-card--clean fade-in';
        card.dataset.accent = member.accent || 'sage';

        const shell = document.createElement('div');
        shell.className = 'team-profile-clean-shell';

        const portrait = document.createElement('figure');
        portrait.className = 'team-profile-clean-portrait';

        const image = document.createElement('img');
        image.className = 'team-profile-clean-image';
        image.src = member.image || '/logo.svg';
        image.alt = `${member.name} portrait`;
        image.decoding = 'async';
        image.fetchPriority = 'high';
        image.width = 520;
        image.height = 620;

        const caption = document.createElement('figcaption');
        caption.className = 'team-profile-clean-caption';
        caption.textContent = member.role || 'Bloomly Team';

        portrait.append(image, caption);

        const content = document.createElement('div');
        content.className = 'team-profile-clean-content';

        const eyebrow = document.createElement('p');
        eyebrow.className = 'team-profile-eyebrow';
        eyebrow.textContent = 'Bloomly Team';

        const name = document.createElement('h1');
        name.className = 'team-profile-name';
        name.textContent = member.name;

        const role = document.createElement('p');
        role.className = 'team-profile-role';
        role.textContent = member.role || '';

        const summary = document.createElement('p');
        summary.className = 'team-profile-clean-summary';
        summary.textContent = member.summary || member.work?.summary || member.bio || '';

        const focus = document.createElement('p');
        focus.className = 'team-profile-clean-focus';
        focus.textContent = member.panelSummary || '';

        const badges = document.createElement('div');
        badges.className = 'team-profile-clean-badges';
        const detailTags = Array.isArray(member.details) && member.details.length
            ? member.details.slice(0, 4)
            : (member.skills || []).slice(0, 4);
        detailTags.forEach((detail) => {
            const badge = document.createElement('span');
            badge.className = 'team-profile-clean-badge';
            badge.textContent = detail;
            badges.appendChild(badge);
        });

        content.append(eyebrow, name, role, summary);
        if (focus.textContent) {
            content.appendChild(focus);
        }
        if (badges.childElementCount > 0) {
            content.appendChild(badges);
        }

        if (Array.isArray(member.links) && member.links.length) {
            const links = document.createElement('div');
            links.className = 'team-profile-links team-profile-clean-links';
            member.links.forEach((linkData) => {
                const link = document.createElement('a');
                link.className = 'team-profile-link';
                link.href = linkData.url;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                link.textContent = linkData.label;
                links.appendChild(link);
            });
            content.appendChild(links);
        }

        shell.append(portrait, content);
        card.appendChild(shell);
        container.append(backLink, card);
        section.appendChild(container);
        return section;
    }

    function renderCleanProfileOverview(member) {
        const section = document.createElement('section');
        section.className = 'section team-profile-clean-overview';

        const container = document.createElement('div');
        container.className = 'container';

        const grid = document.createElement('div');
        grid.className = 'team-profile-clean-overview-grid';

        const storyCard = document.createElement('article');
        storyCard.className = 'glass-card team-profile-clean-card team-profile-clean-story fade-in';

        const storyTitle = document.createElement('h2');
        storyTitle.textContent = 'Personal Story';

        const storyBody = document.createElement('div');
        storyBody.className = 'team-profile-clean-story-content';
        const storyParagraphs = getStoryParagraphs(member);
        if (storyParagraphs.length) {
            storyParagraphs.forEach((text) => {
                const paragraph = document.createElement('p');
                paragraph.textContent = text;
                storyBody.appendChild(paragraph);
            });
        } else {
            const paragraph = document.createElement('p');
            paragraph.textContent = member.bio || member.summary || '';
            storyBody.appendChild(paragraph);
        }
        storyCard.append(storyTitle, storyBody);

        const focusCard = document.createElement('article');
        focusCard.className = 'glass-card team-profile-clean-card team-profile-clean-focus-card fade-in';

        const focusTitle = document.createElement('h2');
        focusTitle.textContent = 'Current Focus at Bloomly';

        const focusCopy = document.createElement('p');
        focusCopy.className = 'team-profile-clean-work-copy';
        focusCopy.textContent = member.work?.summary || member.summary || member.bio || '';

        const highlights = Array.isArray(member.work?.highlights) && member.work.highlights.length
            ? member.work.highlights
            : (member.details || member.skills || []);
        const list = document.createElement('ul');
        list.className = 'team-profile-clean-list';
        highlights.slice(0, 6).forEach((item) => {
            const listItem = document.createElement('li');
            listItem.textContent = item;
            list.appendChild(listItem);
        });
        if (!list.childElementCount) {
            const listItem = document.createElement('li');
            listItem.textContent = 'Community care, platform reliability, and meaningful support.';
            list.appendChild(listItem);
        }

        const values = Array.isArray(member.values) && member.values.length
            ? member.values
            : (member.extra?.highlights || []);
        const valuesWrap = document.createElement('div');
        valuesWrap.className = 'team-profile-clean-values';
        values.slice(0, 4).forEach((value) => {
            const valueTag = document.createElement('span');
            valueTag.className = 'team-profile-clean-value';
            valueTag.textContent = value;
            valuesWrap.appendChild(valueTag);
        });

        focusCard.append(focusTitle, focusCopy, list);
        if (valuesWrap.childElementCount) {
            focusCard.appendChild(valuesWrap);
        }
        if (member.extra?.quote) {
            const quote = document.createElement('blockquote');
            quote.className = 'team-profile-clean-quote';
            quote.textContent = member.extra.quote;
            focusCard.appendChild(quote);
        }

        grid.append(storyCard, focusCard);
        container.appendChild(grid);
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
        const heroSection = renderCleanProfileHero(member);
        const overviewSection = renderCleanProfileOverview(member);
        const projectsSection = renderProfileProjectsSection(member);
        const contactSection = renderProfileContactSection(member);

        container.append(heroSection, overviewSection, projectsSection, contactSection);
        initScrollAnimations(container);
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

