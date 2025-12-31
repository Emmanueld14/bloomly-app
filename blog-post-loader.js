/**
 * Blog Post Loader - Dynamically loads a single blog post based on URL slug
 */

(function() {
    'use strict';

    // Get slug from URL
    function getSlugFromURL() {
        // Try query parameter first (for GitHub Pages)
        const urlParams = new URLSearchParams(window.location.search);
        const slugParam = urlParams.get('slug');
        if (slugParam) return slugParam;
        
        // Fallback to pathname (for direct access)
        const path = window.location.pathname;
        const match = path.match(/\/blog\/([^\/]+)(?:\.html)?$/);
        return match ? match[1] : null;
    }

    // Parse markdown frontmatter and body
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
        
        // Convert markdown to HTML
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

    // Load and render the post
    async function loadPost() {
        const slug = getSlugFromURL();
        if (!slug) {
            document.getElementById('articleTitle').textContent = 'Post Not Found';
            document.getElementById('articleBody').innerHTML = '<p>Unable to find this blog post. <a href="blog.html">Return to blog</a></p>';
            return;
        }

        try {
            let parsed = null;

            // Try to load from API first (new backend)
            try {
                const apiResponse = await fetch(`/.netlify/functions/get-post?slug=${slug}`);
                if (apiResponse.ok) {
                    const post = await apiResponse.json();
                    // Convert markdown body to HTML
                    let html = post.body
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
                    
                    parsed = {
                        metadata: {
                            title: post.title,
                            date: post.date,
                            category: post.category,
                            summary: post.summary,
                            emoji: post.emoji,
                            featuredImage: post.featuredImage,
                        },
                        body: html,
                    };
                }
            } catch (apiError) {
                console.warn('API not available, falling back to markdown file:', apiError);
            }

            // Fallback to markdown file if API fails
            if (!parsed) {
                const response = await fetch(`content/blog/${slug}.md`);
                if (!response.ok) {
                    throw new Error('Post not found');
                }
                
                const markdown = await response.text();
                parsed = parseMarkdown(markdown);
                
                if (!parsed) {
                    throw new Error('Invalid post format');
                }
            }
            
            // Update page title
            document.getElementById('articleTitle').textContent = parsed.metadata.title;
            document.title = `${parsed.metadata.title} - Bloomly Blog`;
            
            // Update meta description
            const metaDesc = document.querySelector('meta[name="description"]');
            if (!metaDesc) {
                const meta = document.createElement('meta');
                meta.name = 'description';
                meta.content = parsed.metadata.summary || '';
                document.head.appendChild(meta);
            } else {
                metaDesc.content = parsed.metadata.summary || '';
            }
            
            // Format date
            const date = new Date(parsed.metadata.date);
            const dateStr = date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
            
            // Update meta info
            const category = parsed.metadata.category || 'Mental Health';
            const wordCount = parsed.body.split(' ').length;
            const readTime = Math.ceil(wordCount / 200);
            
            document.getElementById('articleMeta').innerHTML = `
                <span>${dateStr}</span>
                <span>•</span>
                <span>${category}</span>
                <span>•</span>
                <span>${readTime} min read</span>
            `;
            
            // Render body
            const bodyEl = document.getElementById('articleBody');
            bodyEl.innerHTML = parsed.body;
            
            // Add featured image if available
            if (parsed.metadata.featuredImage) {
                const img = document.createElement('img');
                img.src = parsed.metadata.featuredImage;
                img.alt = parsed.metadata.title;
                img.style.cssText = 'width: 100%; border-radius: var(--radius-xl); margin-bottom: var(--space-xl);';
                bodyEl.insertBefore(img, bodyEl.firstChild);
            }
            
            // Add CTA at the end
            const cta = document.createElement('div');
            cta.style.cssText = 'margin-top: var(--space-3xl); padding: var(--space-xl); background: var(--gradient-soft); border-radius: var(--radius-xl); text-align: center;';
            cta.innerHTML = `
                <h3 style="margin-bottom: var(--space-md);">Want to Read More?</h3>
                <p style="margin-bottom: var(--space-lg);">Check out our other articles for more mental health tips and support.</p>
                <a href="blog.html" class="btn btn-primary">Read More Articles</a>
            `;
            bodyEl.appendChild(cta);
            
        } catch (error) {
            console.error('Error loading post:', error);
            document.getElementById('articleTitle').textContent = 'Post Not Found';
            document.getElementById('articleBody').innerHTML = `
                <p>Unable to load this blog post. <a href="blog.html">Return to blog</a></p>
            `;
        }
    }
    
    // Initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadPost);
    } else {
        loadPost();
    }
})();

