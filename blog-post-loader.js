/**
 * Blog Post Loader - Loads individual blog post from markdown
 */

(function() {
    'use strict';

    // Parse markdown (same as blog-loader.js)
    function parseMarkdown(markdown) {
        const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
        const match = markdown.match(frontmatterRegex);
        
        if (!match) return null;
        
        const frontmatter = match[1];
        const body = match[2];
        
        const metadata = {};
        frontmatter.split('\n').forEach(line => {
            const colonIndex = line.indexOf(':');
            if (colonIndex > 0) {
                const key = line.substring(0, colonIndex).trim();
                let value = line.substring(colonIndex + 1).trim();
                if ((value.startsWith('"') && value.endsWith('"')) || 
                    (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
                }
                metadata[key] = value;
            }
        });
        
        // Enhanced markdown to HTML
        let html = body
            .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h2>$1</h2>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/^- (.*$)/gim, '<li>$1</li>')
            .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/^(.*)$/gm, '<p>$1</p>');
        
        html = html.replace(/<p><\/p>/g, '');
        html = html.replace(/<p>(<h[2-4]>.*<\/h[2-4]>)<\/p>/g, '$1');
        html = html.replace(/<p>(<ul>.*<\/ul>)<\/p>/g, '$1');
        
        return {
            metadata: metadata,
            body: html
        };
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }

    async function loadBlogPost() {
        // Get slug from URL
        const path = window.location.pathname;
        const slug = path.split('/').pop().replace('.html', '');
        
        if (!slug) {
            document.getElementById('articleTitle').textContent = 'Post Not Found';
            return;
        }

        try {
            const response = await fetch(`../content/blog/${slug}.md`);
            if (!response.ok) {
                throw new Error('Post not found');
            }

            const markdown = await response.text();
            const parsed = parseMarkdown(markdown);

            if (!parsed) {
                throw new Error('Failed to parse post');
            }

            // Update title
            document.getElementById('articleTitle').textContent = parsed.metadata.title;
            document.title = `${parsed.metadata.title} - Bloomly Blog`;

            // Update meta
            const date = formatDate(parsed.metadata.date);
            const category = parsed.metadata.category || 'Mental Health';
            const metaEl = document.getElementById('articleMeta');
            metaEl.innerHTML = `
                <span>${date}</span>
                <span>•</span>
                <span>${category}</span>
                <span>•</span>
                <span>${Math.ceil(parsed.body.split(' ').length / 200)} min read</span>
            `;

            // Update body
            const bodyEl = document.getElementById('articleBody');
            bodyEl.innerHTML = parsed.body;

            // Add CTA at the end
            const cta = document.createElement('div');
            cta.style.cssText = 'margin-top: var(--space-3xl); padding: var(--space-xl); background: var(--gradient-soft); border-radius: var(--radius-xl); text-align: center;';
            cta.innerHTML = `
                <h3 style="margin-bottom: var(--space-md);">Want to Read More?</h3>
                <p style="margin-bottom: var(--space-lg);">Check out our other articles for more mental health tips and support.</p>
                <a href="../blog.html" class="btn btn-primary">Read More Articles</a>
            `;
            bodyEl.appendChild(cta);

        } catch (error) {
            console.error('Error loading blog post:', error);
            document.getElementById('articleTitle').textContent = 'Post Not Found';
            document.getElementById('articleBody').innerHTML = '<p>Sorry, this post could not be loaded.</p>';
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadBlogPost);
    } else {
        loadBlogPost();
    }

})();

