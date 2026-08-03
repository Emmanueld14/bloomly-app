/**
 * Lightweight post-page enhancements — reading progress and copy-link.
 * Article content is pre-rendered in HTML; no API calls.
 */
(function () {
    'use strict';

    function updateReadingProgress() {
        const bar = document.querySelector('[data-reading-progress]');
        const article = document.getElementById('articleBody');
        if (!bar || !article) return;
        const rect = article.getBoundingClientRect();
        const scrollable = Math.max(1, rect.height - window.innerHeight + 160);
        const progress = Math.min(1, Math.max(0, (0 - rect.top + 120) / scrollable));
        bar.style.transform = 'scaleX(' + progress + ')';
    }

    function initReadingProgress() {
        updateReadingProgress();
        window.addEventListener('scroll', updateReadingProgress, { passive: true });
        window.addEventListener('resize', updateReadingProgress);
    }

    function initCopyLink() {
        const button = document.querySelector('[data-copy-link]');
        if (!button) return;
        button.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(window.location.href);
                button.textContent = 'Copied!';
            } catch (error) {
                button.textContent = 'Copy failed';
            }
            window.setTimeout(() => {
                button.textContent = 'Copy link';
            }, 2000);
        });
    }

    function init() {
        initReadingProgress();
        initCopyLink();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
