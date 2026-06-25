/**
 * Resources page dynamic card configuration.
 * Each card owns its own external URL and opens in a new tab.
 */
(function() {
    'use strict';

    const RESOURCE_CARDS = [
        {
            label: 'Learn smarter',
            title: 'AI Tools',
            externalUrl: 'https://www.ibm.com/think/topics/artificial-intelligence-tools',
            linkText: 'Learn More',
            icon: 'ai',
            items: [
                { text: 'AI tool categories for students', tag: 'Guide' },
                { text: 'Best-use practices and prompts', tag: 'Article' },
                { text: 'Responsible AI basics', tag: 'External' }
            ]
        },
        {
            label: 'Build online',
            title: 'Web Development',
            externalUrl: 'https://developer.mozilla.org/en-US/docs/Learn_web_development',
            linkText: 'Learn More',
            icon: 'web',
            items: [
                { text: 'HTML, CSS, and JavaScript fundamentals', tag: 'Guide' },
                { text: 'Interactive project tutorials', tag: 'Tutorial' },
                { text: 'Core web standards and docs', tag: 'External' }
            ]
        },
        {
            label: 'Feel steady',
            title: 'Mental Wellness',
            externalUrl: 'https://www.who.int/health-topics/adolescent-health',
            linkText: 'Learn More',
            icon: 'wellness',
            items: [
                { text: 'Stress and wellbeing basics', tag: 'Article' },
                { text: 'Healthy student routines', tag: 'Guide' },
                { text: 'Trusted youth wellbeing information', tag: 'External' }
            ]
        },
        {
            label: 'Plan ahead',
            title: 'Career & University',
            externalUrl: 'https://www.ucas.com/undergraduate/applying-university',
            linkText: 'Learn More',
            icon: 'career',
            featured: true,
            items: [
                { text: 'Application preparation overview', tag: 'Checklist' },
                { text: 'Personal statement direction', tag: 'Guide' },
                { text: 'Admissions pathway support', tag: 'External' }
            ]
        }
    ];

    const ICONS = {
        ai: `
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 3v3"/>
                <path d="M12 18v3"/>
                <path d="M4.2 6.2l2.1 2.1"/>
                <path d="M17.7 17.7l2.1 2.1"/>
                <path d="M3 12h3"/>
                <path d="M18 12h3"/>
                <path d="M4.2 17.8l2.1-2.1"/>
                <path d="M17.7 6.3l2.1-2.1"/>
                <circle cx="12" cy="12" r="4.2"/>
            </svg>
        `,
        web: `
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="9"/>
                <path d="M3 12h18"/>
                <path d="M12 3a14.8 14.8 0 0 1 4 9 14.8 14.8 0 0 1-4 9 14.8 14.8 0 0 1-4-9 14.8 14.8 0 0 1 4-9z"/>
            </svg>
        `,
        wellness: `
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21.2l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z"/>
            </svg>
        `,
        career: `
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 10 12 5 2 10l10 5 10-5z"/>
                <path d="M6 12.5V17c0 1.7 2.7 3 6 3s6-1.3 6-3v-4.5"/>
            </svg>
        `
    };

    function openExternal(url) {
        if (!url) return;
        window.open(url, '_blank', 'noopener,noreferrer');
    }

    function createResourceItem(item, externalUrl) {
        const link = document.createElement('a');
        link.href = externalUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = item.text;

        const badge = document.createElement('span');
        badge.textContent = item.tag;
        link.appendChild(badge);
        return link;
    }

    function createResourceCard(card) {
        const article = document.createElement('article');
        article.className = `resource-category-card${card.featured ? ' resource-category-card-featured' : ''}`;
        article.setAttribute('data-external-url', card.externalUrl);
        article.tabIndex = 0;
        article.setAttribute('role', 'link');
        article.setAttribute('aria-label', `${card.title} external resource`);

        const icon = ICONS[card.icon] || ICONS.career;
        article.innerHTML = `
            <div class="resource-category-header">
                <span class="resource-icon" aria-hidden="true">${icon}</span>
                <div>
                    <span class="resource-label">${card.label}</span>
                    <h3>${card.title}</h3>
                </div>
            </div>
            <div class="resource-list"></div>
            <div class="resource-card-actions">
                <a class="btn btn-outline resource-card-link" href="${card.externalUrl}" target="_blank" rel="noopener noreferrer">${card.linkText || 'Learn More'}</a>
            </div>
        `;

        const resourceList = article.querySelector('.resource-list');
        card.items.forEach((item) => {
            resourceList.appendChild(createResourceItem(item, card.externalUrl));
        });

        article.addEventListener('click', (event) => {
            if (event.target.closest('a,button')) return;
            openExternal(card.externalUrl);
        });

        article.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            openExternal(card.externalUrl);
        });

        return article;
    }

    function initResourceCards() {
        const container = document.querySelector('[data-resource-cards]');
        if (!container) return;

        const fragment = document.createDocumentFragment();
        RESOURCE_CARDS.forEach((card) => {
            fragment.appendChild(createResourceCard(card));
        });
        container.appendChild(fragment);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initResourceCards);
    } else {
        initResourceCards();
    }
})();
