/**
 * Category filter for Bloomly resource guides (internal pages only).
 */
(function () {
    'use strict';

    const grid = document.getElementById('resourceGuidesGrid');
    const buttons = document.querySelectorAll('[data-filter]');
    if (!grid || !buttons.length) return;

    const cards = Array.from(grid.querySelectorAll('.resource-guide-card'));

    function setFilter(filter) {
        cards.forEach((card) => {
            const category = card.getAttribute('data-category') || '';
            const show = filter === 'all' || category === filter;
            card.style.display = show ? '' : 'none';
        });

        buttons.forEach((btn) => {
            btn.classList.toggle('is-active', btn.getAttribute('data-filter') === filter);
        });
    }

    buttons.forEach((btn) => {
        btn.addEventListener('click', () => {
            setFilter(btn.getAttribute('data-filter') || 'all');
        });
    });
})();
