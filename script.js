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
        const isTeamProfile = path.includes('/team/');
        const isSubscribePage = path.includes('/subscribe') || path.endsWith('subscribe.html');
        
        links.forEach(link => {
            const linkPath = link.getAttribute('href') || '';
            const normalizedLinkPath = linkPath.split('?')[0];
            const linkSegment = normalizedLinkPath.split('/').pop();
            const isBlogLink = normalizedLinkPath.endsWith('blog.html') || normalizedLinkPath.endsWith('/blog');
            const isAboutLink = normalizedLinkPath.endsWith('about.html');
            const isSubscribeLink = normalizedLinkPath.endsWith('subscribe.html');
            
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

            if ((isBlogPost || isBlogRoot) && isBlogLink) {
                link.classList.add('active');
            } else if (!isBlogPost && !isTeamProfile && !isSubscribePage) {
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
    function initScrollAnimations() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, observerOptions);

        // Observe all fade-in elements
        const fadeElements = document.querySelectorAll('.fade-in');
        fadeElements.forEach(el => observer.observe(el));
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
        normalizeCategory,
        getDefaultBlogCategories,
        getBlogCategoryFromUrl,
        renderBlogCategoryPanel
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

        const params = new URLSearchParams(window.location.search);
        const slugParam = params.get('slug');
        if (slugParam) {
            return slugParam;
        }

        const match = window.location.pathname.match(/\/blog\/([^\/]+)(?:\.html)?$/);
        return match ? match[1] : null;
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

        for (const block of interactionBlocks) {
            const postId = resolvePostId(block);
            if (!postId) {
                console.warn('Post interactions skipped: missing data-post-id.');
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

        const { data, error } = await supabaseClient
            .from('subscribers')
            .insert({ email })
            .select('id, email')
            .single();

        if (error) {
            if (isDuplicateDatabaseError(error)) {
                return { status: 'already_subscribed' };
            }
            return { status: 'error', error };
        }

        return { status: 'subscribed', subscriber: data };
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
            slug: 'manuel-muhunami',
            name: 'Manuel Muhunami',
            role: 'Founder & Community Lead',
            image: '/logo.svg',
            accent: 'sage',
            details: [
                'Community safety & trust',
                'Platform vision & partnerships',
                'Teen support strategy'
            ],
            panelSummary: 'Keeps Bloomly rooted in empathy, safety, and belonging.',
            bio: 'Manuel began journaling as a way to survive heavy days. Bloomly grew from that quiet practice into a shared space for teens who want to feel seen.',
            work: {
                summary: 'Manuel guides Bloomly with an emphasis on trust, care, and real stories.',
                highlights: [
                    'Shapes the platform roadmap and community values.',
                    'Partners with schools and youth advocates to expand support.',
                    'Keeps every experience grounded in empathy and safety.'
                ]
            },
            links: [
                { label: 'LinkedIn', url: 'https://www.linkedin.com/in/manuel-muhunami' },
                { label: 'Portfolio', url: 'https://www.behance.net/manuel-muhunami' }
            ]
        },
        {
            slug: 'amina-wambui',
            name: 'Amina Wambui',
            role: 'Wellness Program Lead',
            image: '/logo.svg',
            accent: 'mist',
            details: [
                'Wellness resource design',
                'Check-ins & self-care plans',
                'Program research'
            ],
            panelSummary: 'Designs calming routines that make support feel doable.',
            bio: 'Amina listens for the small moments that make people feel calm. She turns those moments into gentle wellness tools for teens.',
            work: {
                summary: 'Amina curates Bloomly wellness experiences so they feel soft, practical, and teen-friendly.',
                highlights: [
                    'Designs self-care toolkits and guided check-ins.',
                    'Translates research into clear, approachable routines.',
                    'Keeps support tools inclusive and easy to return to.'
                ]
            },
            links: [
                { label: 'LinkedIn', url: 'https://www.linkedin.com/in/amina-wambui' }
            ]
        },
        {
            slug: 'brian-otieno',
            name: 'Brian Otieno',
            role: 'Content & Outreach',
            image: '/logo.svg',
            accent: 'stone',
            details: [
                'Content storytelling',
                'Community outreach',
                'Youth engagement'
            ],
            panelSummary: 'Tells stories that make mental health feel human.',
            bio: 'Brian believes words can soften the hardest days. He shapes Bloomly stories to feel warm, honest, and easy to understand.',
            work: {
                summary: 'Brian leads Bloomly storytelling so teens can connect with support that feels familiar.',
                highlights: [
                    'Shapes the Bloomly content voice and storytelling.',
                    'Partners with schools and youth groups for outreach.',
                    'Builds campaigns that keep the community connected.'
                ]
            },
            links: [
                { label: 'LinkedIn', url: 'https://www.linkedin.com/in/brian-otieno' },
                { label: 'GitHub', url: 'https://github.com/brian-otieno' }
            ]
        }
    ];

    // ========== Bloomly Team Cards ==========
    function buildTeamCard(member, index) {
        const wrapper = document.createElement('article');
        wrapper.className = 'bloomly-team-item';
        wrapper.dataset.teamCard = '';
        wrapper.dataset.accent = member.accent || 'sage';
        wrapper.dataset.slug = member.slug;
        wrapper.setAttribute('aria-expanded', 'false');

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

        const link = document.createElement('a');
        link.className = 'bloomly-team-link';
        link.href = `/team/${member.slug}`;
        link.textContent = 'View Profile';

        info.append(eyebrow, name, role, link);
        core.append(avatar, info);
        card.appendChild(core);

        const panel = document.createElement('aside');
        panel.className = 'bloomly-team-panel';
        panel.dataset.teamPanel = '';
        panel.id = `bloomly-team-panel-${index + 1}`;
        panel.setAttribute('aria-hidden', 'true');

        const panelTitle = document.createElement('p');
        panelTitle.className = 'bloomly-team-panel-title';
        panelTitle.textContent = 'Focus areas';

        const panelSummary = document.createElement('p');
        panelSummary.className = 'bloomly-team-panel-summary';
        panelSummary.textContent = member.panelSummary || '';

        const detailList = document.createElement('ul');
        detailList.className = 'bloomly-team-details';
        (member.details || []).slice(0, 3).forEach((detail) => {
            const item = document.createElement('li');
            item.textContent = detail;
            detailList.appendChild(item);
        });

        panel.append(panelTitle, panelSummary, detailList);
        wrapper.append(card, panel);

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
        const cards = document.querySelectorAll('[data-team-card]');
        if (!cards.length) return;

        const supportsHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

        const closeCard = (card) => {
            if (!card) return;
            card.classList.remove('is-expanded');
            card.setAttribute('aria-expanded', 'false');
            const panel = card.querySelector('[data-team-panel]');
            if (panel) {
                panel.setAttribute('aria-hidden', 'true');
            }
        };

        const openCard = (card) => {
            if (!card) return;
            card.classList.add('is-expanded');
            card.setAttribute('aria-expanded', 'true');
            const panel = card.querySelector('[data-team-panel]');
            if (panel) {
                panel.setAttribute('aria-hidden', 'false');
            }
        };

        const closeAllCards = () => {
            cards.forEach(card => closeCard(card));
        };

        cards.forEach((card) => {
            const panel = card.querySelector('[data-team-panel]');
            if (panel) {
                panel.setAttribute('aria-hidden', 'true');
            }

            if (!supportsHover) {
                card.setAttribute('tabindex', '0');

                const toggleCard = () => {
                    if (card.classList.contains('is-expanded')) {
                        closeCard(card);
                    } else {
                        closeAllCards();
                        openCard(card);
                    }
                };

                card.addEventListener('click', (event) => {
                    if (event.target.closest('a')) {
                        return;
                    }
                    if (event.target.closest('[data-team-panel]')) {
                        return;
                    }
                    toggleCard();
                });

                card.addEventListener('keydown', (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        toggleCard();
                    }
                });
            }
        });

        if (!supportsHover) {
            document.addEventListener('click', (event) => {
                if (!event.target.closest('[data-team-card]')) {
                    closeAllCards();
                }
            });

            document.addEventListener('keydown', (event) => {
                if (event.key === 'Escape') {
                    closeAllCards();
                }
            });
        }
    }

    // ========== Team Profile Page ==========
    function resolveTeamSlug() {
        const params = new URLSearchParams(window.location.search);
        const slugParam = params.get('slug');
        if (slugParam) {
            return slugParam.replace(/\.html$/, '');
        }

        const match = window.location.pathname.match(/\/team\/([^\/?#]+)(?:\.html)?$/);
        return match ? match[1] : null;
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
        message.textContent = 'We could not find this team profile. Please return to the About page to meet the team.';

        const link = document.createElement('a');
        link.className = 'btn btn-primary';
        link.href = '/about.html';
        link.textContent = 'Back to About';

        card.append(message, link);
        wrapper.appendChild(card);
        section.appendChild(wrapper);
        container.appendChild(section);
    }

    function initTeamProfilePage() {
        const container = document.querySelector('[data-team-profile]');
        if (!container) return;

        const slug = resolveTeamSlug();
        const member = BLOOMLY_TEAM_MEMBERS.find((item) => item.slug === slug);
        if (!member) {
            renderTeamProfileNotFound(container);
            return;
        }

        document.title = `${member.name} - Bloomly`;

        container.innerHTML = '';

        const heroSection = document.createElement('section');
        heroSection.className = 'team-profile-hero';

        const heroContainer = document.createElement('div');
        heroContainer.className = 'container';

        const backLink = document.createElement('a');
        backLink.className = 'back-button';
        backLink.href = '/about.html';
        backLink.textContent = 'Back to About';

        const profileCard = document.createElement('div');
        profileCard.className = 'glass-card team-profile-card fade-in';

        const avatar = document.createElement('div');
        avatar.className = 'team-profile-avatar';

        const image = document.createElement('img');
        image.className = 'team-profile-image';
        image.src = member.image || '/logo.svg';
        image.alt = `${member.name} portrait`;

        avatar.appendChild(image);

        const info = document.createElement('div');
        info.className = 'team-profile-info';

        const eyebrow = document.createElement('p');
        eyebrow.className = 'team-profile-eyebrow';
        eyebrow.textContent = 'Bloomly Team';

        const name = document.createElement('h1');
        name.className = 'team-profile-name';
        name.textContent = member.name;

        const role = document.createElement('p');
        role.className = 'team-profile-role';
        role.textContent = member.role;

        const bio = document.createElement('p');
        bio.className = 'team-profile-bio';
        bio.textContent = member.bio;

        info.append(eyebrow, name, role, bio);

        if (Array.isArray(member.links) && member.links.length) {
            const links = document.createElement('div');
            links.className = 'team-profile-links';

            member.links.forEach((linkData) => {
                const link = document.createElement('a');
                link.className = 'team-profile-link';
                link.href = linkData.url;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                link.textContent = linkData.label;
                links.appendChild(link);
            });

            info.appendChild(links);
        }

        profileCard.append(avatar, info);
        heroContainer.append(backLink, profileCard);
        heroSection.appendChild(heroContainer);

        const workSection = document.createElement('section');
        workSection.className = 'section team-profile-work';

        const workContainer = document.createElement('div');
        workContainer.className = 'container';

        const workCard = document.createElement('div');
        workCard.className = 'glass-card team-profile-work-card fade-in';

        const workTitle = document.createElement('h2');
        workTitle.textContent = 'Work at Bloomly';
        workTitle.id = `work-at-bloomly-${member.slug}`;
        workSection.setAttribute('aria-labelledby', workTitle.id);

        const workCopy = document.createElement('p');
        workCopy.className = 'team-profile-work-copy';
        workCopy.textContent = member.work?.summary || '';

        workCard.append(workTitle, workCopy);

        if (Array.isArray(member.work?.highlights) && member.work.highlights.length) {
            const grid = document.createElement('div');
            grid.className = 'team-profile-work-grid';
            member.work.highlights.forEach((item) => {
                const workItem = document.createElement('div');
                workItem.className = 'team-profile-work-item';
                workItem.textContent = item;
                grid.appendChild(workItem);
            });
            workCard.appendChild(grid);
        }

        workContainer.appendChild(workCard);
        workSection.appendChild(workContainer);

        container.append(heroSection, workSection);
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
        initTeamProfilePage();
        
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

