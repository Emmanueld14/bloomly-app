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
        const isBlogPost = path.includes('/blog/') && path !== '/blog.html';
        
        links.forEach(link => {
            const linkPath = link.getAttribute('href');
            const isBlogLink = linkPath === 'blog.html' || linkPath === '../blog.html' || linkPath.includes('blog.html');
            
            // Remove active class first
            link.classList.remove('active');
            
            // Check if this link should be active
            if (isBlogPost && isBlogLink) {
                link.classList.add('active');
            } else if (!isBlogPost) {
                if (linkPath === currentPath || 
                    (currentPath === '' && linkPath === 'index.html') ||
                    (currentPath === 'index.html' && linkPath === 'index.html') ||
                    (path.endsWith('/') && linkPath === 'index.html')) {
                    link.classList.add('active');
                }
            }
        });
    }

    // Navbar scroll effect
    function handleNavbarScroll() {
        if (window.scrollY > 20) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    }

    // Mobile menu toggle
    function toggleMobileMenu() {
        navLinks.classList.toggle('active');
        const isOpen = navLinks.classList.contains('active');
        
        // Update aria label
        mobileMenuToggle.setAttribute('aria-expanded', isOpen);
        
        // Change icon (simple toggle)
        const icon = mobileMenuToggle.querySelector('svg');
        if (isOpen) {
            icon.innerHTML = '<path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2"/>';
        } else {
            icon.innerHTML = '<path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" stroke-width="2"/>';
        }
    }

    // Close mobile menu when clicking outside
    function closeMobileMenuOnClickOutside(event) {
        if (navLinks.classList.contains('active') && 
            !navLinks.contains(event.target) && 
            !mobileMenuToggle.contains(event.target)) {
            navLinks.classList.remove('active');
            mobileMenuToggle.querySelector('svg').innerHTML = '<path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" stroke-width="2"/>';
        }
    }

    // Close mobile menu when clicking a link
    function closeMobileMenuOnLinkClick() {
        const links = navLinks.querySelectorAll('a');
        links.forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                mobileMenuToggle.querySelector('svg').innerHTML = '<path d="M3 12h18M3 6h18M3 18h18"/>';
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
                        const offsetTop = target.offsetTop - 80; // Account for fixed navbar
                        window.scrollTo({
                            top: offsetTop,
                            behavior: 'smooth'
                        });
                    }
                }
            });
        });
    }

    // ========== Form Handling ==========
    function initContactForm() {
        const contactForm = document.getElementById('contactForm');
        if (contactForm) {
            contactForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                // Get form data
                const formData = new FormData(this);
                const data = Object.fromEntries(formData);
                
                // Simple validation
                if (!data.name || !data.email || !data.message) {
                    alert('Please fill in all required fields.');
                    return;
                }
                
                // Email validation
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(data.email)) {
                    alert('Please enter a valid email address.');
                    return;
                }
                
                // Simulate form submission
                // In production, you would send this to a server
                console.log('Form submitted:', data);
                
                // Show success message
                alert('Thank you for your message! We\'ll get back to you soon.');
                
                // Reset form
                this.reset();
            });
        }
    }
    
    // ========== Floating Shapes Animation ==========
    function initFloatingShapes() {
        const shapes = document.querySelectorAll('.floating-shape');
        shapes.forEach((shape, index) => {
            // Add random delay to each shape
            shape.style.animationDelay = `${index * -2}s`;
        });
    }

    // ========== Newsletter Form ==========
    function initNewsletterForm() {
        const newsletterForms = document.querySelectorAll('form[action*="newsletter"], form:has(input[type="email"][placeholder*="email" i])');
        newsletterForms.forEach(form => {
            const emailInput = form.querySelector('input[type="email"]');
            if (emailInput && emailInput.placeholder.toLowerCase().includes('email')) {
                form.addEventListener('submit', function(e) {
                    e.preventDefault();
                    const email = emailInput.value.trim();
                    
                    if (!email) {
                        alert('Please enter your email address.');
                        return;
                    }
                    
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(email)) {
                        alert('Please enter a valid email address.');
                        return;
                    }
                    
                    // Simulate subscription
                    console.log('Newsletter subscription:', email);
                    alert('Thank you for subscribing!');
                    emailInput.value = '';
                });
            }
        });
    }

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
        const cards = document.querySelectorAll('.card, .blog-card');
        cards.forEach(card => {
            card.addEventListener('mouseenter', function() {
                this.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
            });
        });
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
        
        // Forms
        initContactForm();
        initNewsletterForm();
        
        // Interactive effects
        initButtonEffects();
        initCardEffects();
        initFloatingShapes();
        
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
