/**
 * Blog Loader - Dynamically loads blog posts from markdown files
 * Uses marked.js for markdown parsing
 */

(function() {
    'use strict';

    // Simple markdown parser (basic implementation)
    function parseMarkdown(markdown) {
        // Split frontmatter and body
        const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
        const match = markdown.match(frontmatterRegex);
        
        if (!match) return null;
        
        const frontmatter = match[1];
        const body = match[2];
        
        // Parse frontmatter
        const metadata = {};
        frontmatter.split('\n').forEach(line => {
            const colonIndex = line.indexOf(':');
            if (colonIndex > 0) {
                const key = line.substring(0, colonIndex).trim();
                let value = line.substring(colonIndex + 1).trim();
                // Remove quotes
                if ((value.startsWith('"') && value.endsWith('"')) || 
                    (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
                }
                metadata[key] = value;
            }
        });
        
        // Simple markdown to HTML conversion
        let html = body
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h2>$1</h2>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/^- (.*$)/gim, '<li>$1</li>')
            .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/^(.*)$/gm, '<p>$1</p>');
        
        // Clean up empty paragraphs
        html = html.replace(/<p><\/p>/g, '');
        
        return {
            metadata: metadata,
            body: html
        };
    }

    // Format date
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }

    // Get slug from filename
    function getSlug(filename) {
        return filename.replace('.md', '');
    }

    // Load blog posts
    async function loadBlogPosts() {
        const blogGrid = document.getElementById('blogGrid');
        if (!blogGrid) return;

        try {
            const posts = [];

            // List of blog post files
            // To add a new post: Create a markdown file in content/blog/ and add the filename here
            // The filename should match the slug (e.g., "my-new-post.md")
            const blogPosts = [
                'self-care-practices.md',
                'supporting-friends.md',
                'mindfulness-beginners.md',
                'building-confidence.md',
                'exam-stress.md',
                'understanding-anxiety.md',
                'do-you-still-feel-too-attached.md',
                'new-year-new-me.md'
            ];

            // Load each post
            for (const filename of blogPosts) {
                try {
                    const response = await fetch(`content/blog/${filename}`);
                    if (!response.ok) continue;
                    
                    const markdown = await response.text();
                    const parsed = parseMarkdown(markdown);
                    
                    if (parsed) {
                        parsed.slug = getSlug(filename);
                        posts.push(parsed);
                    }
                } catch (error) {
                    console.warn(`Failed to load ${filename}:`, error);
                }
            }

            // Sort by date (newest first)
            posts.sort((a, b) => {
                const dateA = new Date(a.metadata.date);
                const dateB = new Date(b.metadata.date);
                return dateB - dateA;
            });

            // Render posts
            blogGrid.innerHTML = posts.map(post => {
                const emoji = post.metadata.emoji || '💙';
                const date = formatDate(post.metadata.date);
                const category = post.metadata.category || 'Mental Health';
                const slug = post.slug;
                
                return `
                    <article class="blog-card fade-in">
                        <div class="blog-card-image" style="font-size: var(--text-5xl);">${emoji}</div>
                        <div class="blog-card-content">
                            <div class="blog-card-date">${date} • ${category}</div>
                            <h3>${post.metadata.title}</h3>
                            <p>${post.metadata.summary}</p>
                            <a href="blog-post.html?slug=${slug}" class="blog-card-link">Read More →</a>
                        </div>
                    </article>
                `;
            }).join('');

            // Trigger fade-in animations
            setTimeout(() => {
                const cards = blogGrid.querySelectorAll('.blog-card');
                cards.forEach((card, index) => {
                    setTimeout(() => {
                        card.classList.add('visible');
                    }, index * 100);
                });
            }, 100);

        } catch (error) {
            console.error('Error loading blog posts:', error);
            // Fallback: show error message
            blogGrid.innerHTML = '<p style="text-align: center; color: var(--color-gray-600);">Unable to load blog posts. Please try again later.</p>';
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadBlogPosts);
    } else {
        loadBlogPosts();
    }

})();

