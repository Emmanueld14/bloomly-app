/**
 * Single lightweight bundle for all blog pages: nav, filter, reading progress.
 * No API calls — works with pre-rendered static HTML.
 */
(function () {
    'use strict';

    const navbar = document.getElementById('navbar');
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const navLinks = document.getElementById('navLinks');

    function normalizeRoute(pathname) {
        const withoutQuery = (pathname || '/').split('?')[0].split('#')[0];
        let route = withoutQuery.startsWith('/') ? withoutQuery : '/' + withoutQuery;
        if (route === '/index.html' || route === '/index') return '/';
        route = route.replace(/\/index\.html$/, '').replace(/\.html$/, '');
        if (route.length > 1) route = route.replace(/\/$/, '');
        return route || '/';
    }

    function initNav() {
        if (!navLinks) return;

        const path = window.location.pathname;
        const currentRoute = normalizeRoute(path);
        const isBlog = currentRoute === '/blog' || currentRoute.startsWith('/blog/') || path.includes('/blog-post');
        const isTeam = currentRoute === '/about' || /\/(team|profile|people|members)(\/|$)/.test(path);

        navLinks.querySelectorAll('a').forEach((link) => {
            const linkRoute = normalizeRoute(link.getAttribute('href') || '/');
            let isActive = false;
            if (linkRoute === '/' && currentRoute === '/') isActive = true;
            else if (linkRoute === '/programs' && currentRoute.startsWith('/programs')) isActive = true;
            else if (linkRoute === '/resources' && currentRoute.startsWith('/resources')) isActive = true;
            else if (linkRoute === '/blog' && isBlog) isActive = true;
            else if (linkRoute === '/subscribe' && (currentRoute === '/subscribe' || currentRoute.startsWith('/subscribe/'))) isActive = true;
            else if (linkRoute === '/about' && isTeam) isActive = true;
            link.classList.toggle('active', isActive);
        });

        function handleNavbarScroll() {
            if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 20);
        }

        function closeMobileMenu() {
            if (!navLinks || !mobileMenuToggle) return;
            navLinks.classList.remove('active');
            mobileMenuToggle.setAttribute('aria-expanded', 'false');
            document.body.classList.remove('menu-open');
        }

        if (mobileMenuToggle) {
            mobileMenuToggle.addEventListener('click', () => {
                const shouldOpen = !navLinks.classList.contains('active');
                navLinks.classList.toggle('active', shouldOpen);
                mobileMenuToggle.setAttribute('aria-expanded', String(shouldOpen));
                document.body.classList.toggle('menu-open', shouldOpen);
            });
        }

        navLinks.addEventListener('click', (event) => {
            if (event.target.closest('a')) closeMobileMenu();
        });

        document.addEventListener('click', (event) => {
            if (!navLinks || !mobileMenuToggle || !navLinks.classList.contains('active')) return;
            if (!navLinks.contains(event.target) && !mobileMenuToggle.contains(event.target)) closeMobileMenu();
        });

        handleNavbarScroll();
        window.addEventListener('scroll', handleNavbarScroll, { passive: true });
    }

    function initBlogFilter() {
        const grid = document.getElementById('blogGrid');
        if (!grid || grid.dataset.staticBlogGrid !== 'true') return;

        const cards = Array.from(grid.querySelectorAll('.blog-card'));
        const nav = document.querySelector('[data-blog-category-panel]');
        const searchInput = document.querySelector('[data-blog-search]');
        const loadMoreWrap = document.querySelector('[data-blog-load-more-wrap]');
        const loadMoreButton = document.querySelector('[data-blog-load-more]');
        const perPage = 6;

        let activeCategory = 'all';
        let searchQuery = '';
        let visibleCount = perPage;

        function readCategoryFromUrl() {
            const slug = new URLSearchParams(window.location.search).get('category');
            return slug && slug !== 'all' ? slug.toLowerCase() : 'all';
        }

        function readSearchFromUrl() {
            return (new URLSearchParams(window.location.search).get('search') || '').trim().toLowerCase();
        }

        function updateUrl() {
            const url = new URL('/blog/', window.location.origin);
            if (activeCategory !== 'all') url.searchParams.set('category', activeCategory);
            if (searchQuery) url.searchParams.set('search', searchQuery);
            window.history.replaceState({ category: activeCategory, search: searchQuery }, '', url.toString());
        }

        function cardMatches(card) {
            const category = (card.getAttribute('data-category') || '').toLowerCase();
            if (activeCategory !== 'all' && category !== activeCategory) return false;
            if (searchQuery && !card.textContent.toLowerCase().includes(searchQuery)) return false;
            return true;
        }

        function filteredCards() {
            return cards.filter(cardMatches);
        }

        function setActiveNav() {
            if (!nav) return;
            nav.querySelectorAll('[data-category-slug]').forEach((link) => {
                const slug = (link.getAttribute('data-category-slug') || 'all').toLowerCase();
                link.classList.toggle('is-active', slug === activeCategory);
            });
        }

        function render() {
            const matched = filteredCards();
            cards.forEach((card) => { card.style.display = 'none'; });
            matched.slice(0, visibleCount).forEach((card) => { card.style.display = ''; });

            let emptyState = grid.querySelector('[data-blog-empty-state]');
            if (!matched.length) {
                if (!emptyState) {
                    emptyState = document.createElement('div');
                    emptyState.dataset.blogEmptyState = 'true';
                    emptyState.style.cssText = 'text-align:center;padding:var(--space-2xl);grid-column:1/-1;';
                    emptyState.innerHTML = '<p style="font-size:var(--text-lg);margin-bottom:var(--space-md);color:var(--color-gray-600);">No posts found.</p><p style="font-size:var(--text-sm);color:var(--color-gray-500);">Try another search or category.</p>';
                    grid.appendChild(emptyState);
                }
                emptyState.hidden = false;
            } else if (emptyState) {
                emptyState.hidden = true;
            }

            if (loadMoreWrap) loadMoreWrap.hidden = matched.length <= visibleCount;
        }

        function resetAndRender() {
            visibleCount = perPage;
            render();
            updateUrl();
            setActiveNav();
        }

        if (nav && nav.dataset.blogNavReady !== 'true') {
            nav.dataset.blogNavReady = 'true';
            nav.addEventListener('click', (event) => {
                const link = event.target.closest('[data-category-slug]');
                if (!link) return;
                event.preventDefault();
                activeCategory = (link.getAttribute('data-category-slug') || 'all').toLowerCase();
                resetAndRender();
            });
        }

        if (searchInput && searchInput.dataset.blogSearchReady !== 'true') {
            searchInput.dataset.blogSearchReady = 'true';
            searchInput.addEventListener('input', () => {
                searchQuery = searchInput.value.trim().toLowerCase();
                resetAndRender();
            });
        }

        if (loadMoreButton) {
            loadMoreButton.addEventListener('click', () => {
                visibleCount += perPage;
                render();
            });
        }

        window.addEventListener('popstate', () => {
            activeCategory = readCategoryFromUrl();
            searchQuery = readSearchFromUrl();
            if (searchInput) searchInput.value = searchQuery;
            visibleCount = perPage;
            render();
            setActiveNav();
        });

        activeCategory = readCategoryFromUrl();
        searchQuery = readSearchFromUrl();
        if (searchInput && searchQuery) searchInput.value = searchQuery;

        const needsFilter = activeCategory !== 'all' || searchQuery;
        if (needsFilter) {
            visibleCount = perPage;
            setActiveNav();
            render();
        } else {
            setActiveNav();
        }
    }

    function initPostExtras() {
        const article = document.getElementById('articleBody');
        if (!article || !article.hasAttribute('data-static-content')) return;

        const bar = document.querySelector('[data-reading-progress]');
        function updateReadingProgress() {
            if (!bar || !article) return;
            const rect = article.getBoundingClientRect();
            const scrollable = Math.max(1, rect.height - window.innerHeight + 160);
            const progress = Math.min(1, Math.max(0, (0 - rect.top + 120) / scrollable));
            bar.style.transform = 'scaleX(' + progress + ')';
        }

        updateReadingProgress();
        window.addEventListener('scroll', updateReadingProgress, { passive: true });
        window.addEventListener('resize', updateReadingProgress);

        const button = document.querySelector('[data-copy-link]');
        if (button) {
            button.addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(window.location.href);
                    button.textContent = 'Copied!';
                } catch (error) {
                    button.textContent = 'Copy failed';
                }
                window.setTimeout(() => { button.textContent = 'Copy link'; }, 2000);
            });
        }
    }

    function ensureAuthNav() {
        if (document.querySelector('script[data-bloomly-auth-nav]')) return;
        const script = document.createElement('script');
        script.src = '/public/auth-nav.js?v=20260804a';
        script.defer = true;
        script.setAttribute('data-bloomly-auth-nav', 'true');
        document.head.appendChild(script);
    }

    function ensureInteractions() {
        if (!document.querySelector('.post[data-post-id]')) return;
        if (document.querySelector('script[data-bloomly-interactions]')) return;
        const script = document.createElement('script');
        script.src = '/public/blog-interactions.js?v=20260804a';
        script.defer = true;
        script.setAttribute('data-bloomly-interactions', 'true');
        document.body.appendChild(script);
    }

    function init() {
        initNav();
        ensureAuthNav();
        initBlogFilter();
        initPostExtras();
        ensureInteractions();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
