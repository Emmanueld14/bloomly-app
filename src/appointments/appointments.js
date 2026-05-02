/**
 * Bloomly Charla - Calendly Booking Experience
 * Replace CALENDLY_URLS with your actual Calendly event URLs before launch.
 */
(function() {
    'use strict';

    const CALENDLY_URLS = {
        peer: 'https://calendly.com/YOUR_USERNAME/peer-chat',
        standard: 'https://calendly.com/YOUR_USERNAME/standard-charla',
        premium: 'https://calendly.com/YOUR_USERNAME/premium-charla'
    };

    const calendlyWidget = document.querySelector('[data-calendly-widget]');
    const sessionCards = Array.from(document.querySelectorAll('[data-calendly-type]'));

    function setCalendlyUrl(type) {
        const key = CALENDLY_URLS[type] ? type : 'standard';
        const url = CALENDLY_URLS[key];

        sessionCards.forEach((card) => {
            const isActive = card.dataset.calendlyType === key;
            card.classList.toggle('is-active', isActive);
            card.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });

        if (!calendlyWidget) return;
        calendlyWidget.dataset.url = url;
        calendlyWidget.innerHTML = '';

        if (window.Calendly && typeof window.Calendly.initInlineWidget === 'function') {
            window.Calendly.initInlineWidget({
                url,
                parentElement: calendlyWidget
            });
        }
    }

    sessionCards.forEach((card) => {
        card.addEventListener('click', () => {
            setCalendlyUrl(card.dataset.calendlyType);
        });
    });

    document.querySelectorAll('[data-book-counsellor]').forEach((link) => {
        link.addEventListener('click', () => {
            setCalendlyUrl('standard');
        });
    });

    window.addEventListener('load', () => setCalendlyUrl('standard'));
    setCalendlyUrl('standard');
})();
