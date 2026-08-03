/**
 * DOM-only blog index filtering — no network, no manifest.
 * Works with pre-rendered static cards in blog/index.html.
 */
(function () {
    'use strict';

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
        if (activeCategory !== 'all') {
            url.searchParams.set('category', activeCategory);
        }
        if (searchQuery) {
            url.searchParams.set('search', searchQuery);
        }
        window.history.replaceState({ category: activeCategory, search: searchQuery }, '', url.toString());
    }

    function cardMatches(card) {
        const category = (card.getAttribute('data-category') || '').toLowerCase();
        if (activeCategory !== 'all' && category !== activeCategory) {
            return false;
        }
        if (searchQuery && !card.textContent.toLowerCase().includes(searchQuery)) {
            return false;
        }
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
        cards.forEach((card) => {
            card.style.display = 'none';
        });

        const slice = matched.slice(0, visibleCount);
        slice.forEach((card) => {
            card.style.display = '';
        });

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

        if (loadMoreWrap) {
            loadMoreWrap.hidden = matched.length <= visibleCount;
        }
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
        if (searchInput) {
            searchInput.value = searchQuery;
        }
        visibleCount = perPage;
        render();
        setActiveNav();
    });

    activeCategory = readCategoryFromUrl();
    searchQuery = readSearchFromUrl();
    if (searchInput && searchQuery) {
        searchInput.value = searchQuery;
    }

    if (activeCategory === 'all' && !searchQuery) {
        visibleCount = cards.length;
    }

    setActiveNav();
    render();
})();
