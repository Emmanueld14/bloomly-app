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

    // Load blog posts dynamically from GitHub
    async function loadBlogPosts() {
        const blogGrid = document.getElementById('blogGrid');
        if (!blogGrid) return;

        try {
            const posts = [];

            // Fetch list of markdown files from GitHub API (public repo, no auth needed)
            // This dynamically gets all .md files from content/blog/ directory
            const repoOwner = 'Emmanueld14';
            const repoName = 'bloomly-app';
            const repoBranch = 'main';
            
            try {
                // Get list of files in content/blog directory from GitHub
                const listResponse = await fetch(
                    `https://api.github.com/repos/${repoOwner}/${repoName}/contents/content/blog?ref=${repoBranch}`,
                    {
                        headers: {
                            'Accept': 'application/vnd.github.v3+json'
                        }
                    }
                );
                
                if (listResponse.ok) {
                    const files = await listResponse.json();
                    const markdownFiles = files
                        .filter(file => file.name.endsWith('.md') && file.type === 'file')
                        .map(file => file.name);
                    
                    console.log(`Found ${markdownFiles.length} markdown files:`, markdownFiles);
                    
                    // Load each post from raw GitHub content
                    for (const filename of markdownFiles) {
                        try {
                            const rawUrl = `https://raw.githubusercontent.com/${repoOwner}/${repoName}/${repoBranch}/content/blog/${filename}`;
                            const response = await fetch(rawUrl, {
                                cache: 'no-store' // Prevent caching
                            });
                            
                            if (!response.ok) {
                                console.warn(`Failed to fetch ${filename}: ${response.status} ${response.statusText}`);
                                continue;
                            }
                            
                            const markdown = await response.text();
                            const parsed = parseMarkdown(markdown);
                            
                            if (parsed && parsed.metadata && parsed.metadata.title) {
                                parsed.slug = getSlug(filename);
                                posts.push(parsed);
                                console.log(`✓ Loaded: ${parsed.metadata.title}`);
                            } else {
                                console.warn(`Failed to parse ${filename}:`, parsed);
                            }
                        } catch (error) {
                            console.error(`Error loading ${filename}:`, error);
                        }
                    }
                } else {
                    const errorText = await listResponse.text();
                    console.error('GitHub API failed:', listResponse.status, errorText);
                    throw new Error('GitHub API failed, trying local files');
                }
            } catch (apiError) {
                console.warn('GitHub API failed, trying local files:', apiError);
                
                // Fallback: Try to load from local directory (for development)
                const fallbackPosts = [
                    'self-care-practices.md',
                    'supporting-friends.md',
                    'mindfulness-beginners.md',
                    'building-confidence.md',
                    'exam-stress.md',
                    'understanding-anxiety.md',
                    'do-you-still-feel-too-attached.md',
                    'new-year-new-me.md'
                ];
                
                for (const filename of fallbackPosts) {
                    try {
                        const response = await fetch(`content/blog/${filename}`, {
                            cache: 'no-store'
                        });
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

