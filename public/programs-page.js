/**
 * Programs page interactions: filtering, FAQ accordion, and reveal motion.
 */
(function() {
    'use strict';

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function initProgramFilters() {
        const filterButtons = Array.from(document.querySelectorAll('[data-program-filter]'));
        const cards = Array.from(document.querySelectorAll('[data-program-category]'));
        const emptyState = document.querySelector('[data-program-empty]');

        if (!filterButtons.length || !cards.length) return;

        function applyFilter(filter) {
            let visibleCount = 0;

            cards.forEach((card) => {
                const categories = (card.getAttribute('data-program-category') || '').split(/\s+/);
                const shouldShow = filter === 'all' || categories.includes(filter);
                card.hidden = !shouldShow;
                card.classList.toggle('is-filtered-out', !shouldShow);
                if (shouldShow) visibleCount += 1;
            });

            if (emptyState) {
                emptyState.hidden = visibleCount !== 0;
            }
        }

        filterButtons.forEach((button) => {
            button.addEventListener('click', () => {
                const filter = button.getAttribute('data-program-filter') || 'all';

                filterButtons.forEach((item) => {
                    const isActive = item === button;
                    item.classList.toggle('is-active', isActive);
                    item.setAttribute('aria-pressed', String(isActive));
                });

                applyFilter(filter);
            });
        });
    }

    function initProgramFaq() {
        document.querySelectorAll('[data-program-faq] .program-faq-item').forEach((item) => {
            const button = item.querySelector('button[aria-controls]');
            const panel = button ? item.querySelector(`#${button.getAttribute('aria-controls')}`) : null;
            if (!button || !panel) return;

            button.addEventListener('click', () => {
                const isOpen = button.getAttribute('aria-expanded') === 'true';
                button.setAttribute('aria-expanded', String(!isOpen));
                panel.hidden = isOpen;
                item.classList.toggle('is-open', !isOpen);
            });
        });
    }

    function initProgramReveals() {
        const revealEls = Array.from(document.querySelectorAll('.programs-reveal'));
        if (!revealEls.length) return;

        document.documentElement.classList.add('programs-motion-ready');

        if (reduceMotion || !('IntersectionObserver' in window)) {
            revealEls.forEach((el) => el.classList.add('is-visible'));
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            });
        }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });

        revealEls.forEach((el, index) => {
            el.style.setProperty('--reveal-delay', `${Math.min(index * 55, 420)}ms`);
            observer.observe(el);
        });
    }

    function init() {
        initProgramFilters();
        initProgramFaq();
        initProgramReveals();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
