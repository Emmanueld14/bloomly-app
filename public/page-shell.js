/**
 * Lightweight shell behavior for static informational pages.
 * Keeps nav responsive without loading the full site interaction bundle.
 */
(function() {
    'use strict';

    const navbar = document.getElementById('navbar');
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const navLinks = document.getElementById('navLinks');

    function normalizeRoute(pathname) {
        const withoutQuery = (pathname || '/').split('?')[0].split('#')[0];
        let route = withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`;

        if (route === '/index.html' || route === '/index') {
            return '/';
        }

        route = route.replace(/\/index\.html$/, '').replace(/\.html$/, '');
        if (route.length > 1) {
            route = route.replace(/\/$/, '');
        }

        return route || '/';
    }

    function setActiveNavLink() {
        if (!navLinks) return;

        const currentRoute = normalizeRoute(window.location.pathname);
        navLinks.querySelectorAll('a').forEach((link) => {
            const linkRoute = normalizeRoute(link.getAttribute('href') || '/');
            const isActive = linkRoute === currentRoute || (linkRoute !== '/' && currentRoute.startsWith(`${linkRoute}/`));
            link.classList.toggle('active', isActive);
        });
    }

    function handleNavbarScroll() {
        if (!navbar) return;
        navbar.classList.toggle('scrolled', window.scrollY > 20);
    }

    function closeMobileMenu() {
        if (!navLinks || !mobileMenuToggle) return;

        navLinks.classList.remove('active');
        mobileMenuToggle.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('menu-open');
    }

    function toggleMobileMenu() {
        if (!navLinks || !mobileMenuToggle) return;

        const shouldOpen = !navLinks.classList.contains('active');
        navLinks.classList.toggle('active', shouldOpen);
        mobileMenuToggle.setAttribute('aria-expanded', String(shouldOpen));
        document.body.classList.toggle('menu-open', shouldOpen);
    }

    function init() {
        setActiveNavLink();
        handleNavbarScroll();

        if (mobileMenuToggle) {
            mobileMenuToggle.addEventListener('click', toggleMobileMenu);
        }

        if (navLinks) {
            navLinks.addEventListener('click', (event) => {
                if (event.target.closest('a')) {
                    closeMobileMenu();
                }
            });
        }

        document.addEventListener('click', (event) => {
            if (!navLinks || !mobileMenuToggle || !navLinks.classList.contains('active')) return;
            if (!navLinks.contains(event.target) && !mobileMenuToggle.contains(event.target)) {
                closeMobileMenu();
            }
        });

        window.addEventListener('scroll', handleNavbarScroll, { passive: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
