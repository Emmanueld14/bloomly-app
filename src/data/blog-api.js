/**
 * Unified Blog Data API
 * Single source of truth: GitHub API only
 * NO caching, NO static files, NO localStorage
 */

class BlogAPI {
    constructor() {
        this.repoOwner = 'Emmanueld14';
        this.repoName = 'bloomly-app';
        this.repoBranch = 'main';
        this.basePath = 'content/blog';
        this.apiBase = 'https://api.github.com';
        this.rawBase = 'https://raw.githubusercontent.com';
    }

    /**
     * Generate cache-busting URL - ensures every request is unique
     */
    _cacheBust(url) {
        const separator = url.includes('?') ? '&' : '?';
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(7);
        return `${url}${separator}_t=${timestamp}&_r=${random}`;
    }

    /**
     * Fetch with explicit no-cache - prevents ALL caching layers
     */
    async _fetch(url, options = {}) {
        const bustedUrl = this._cacheBust(url);
        
        return fetch(bustedUrl, {
            ...options,
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
                'Pragma': 'no-cache',
                'Expires': '0',
                'If-None-Match': '',
                'If-Modified-Since': '',
                ...(options.headers || {})
            }
        });
    }

    /**
     * Get list of all blog posts from GitHub
     * Returns array of file metadata
     */
    async listPosts() {
        const url = `${this.apiBase}/repos/${this.repoOwner}/${this.repoName}/contents/${this.basePath}?ref=${this.repoBranch}`;
        
        try {
            const response = await this._fetch(url, {
                headers: {
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = `Failed to list posts: ${response.status} ${response.statusText}`;
                
                if (response.status === 403) {
                    errorMessage += '. GitHub API rate limit exceeded. Please wait a few minutes.';
                } else if (response.status === 404) {
                    errorMessage += '. Blog directory not found.';
                }
                
                console.error('GitHub API error:', response.status, errorText);
                throw new Error(errorMessage);
            }

            const files = await response.json();
            
            // Handle both array and single object responses
            const fileArray = Array.isArray(files) ? files : (files ? [files] : []);
            
            // Filter only markdown files
            const markdownFiles = fileArray
                .filter(file => {
                    if (!file || !file.name) return false;
                    return file.name.endsWith('.md') && file.type === 'file';
                })
                .map(file => ({
                    name: file.name,
                    slug: file.name.replace('.md', ''),
                    sha: file.sha,
                    size: file.size,
                    url: file.download_url || file.url
                }));

            console.log(`Found ${markdownFiles.length} blog post(s) from GitHub`);
            return markdownFiles;
            
        } catch (error) {
            console.error('Error in listPosts:', error);
            throw error;
        }
    }

    /**
     * Get single blog post content from GitHub
     * Returns parsed markdown with metadata
     */
    async getPost(slug) {
        const filename = `${slug}.md`;
        const url = `${this.rawBase}/${this.repoOwner}/${this.repoName}/${this.repoBranch}/${this.basePath}/${filename}`;
        
        try {
            const response = await this._fetch(url);

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error(`Post "${slug}" not found - it may have been deleted`);
                }
                throw new Error(`Failed to load post: ${response.status} ${response.statusText}`);
            }

            const markdown = await response.text();
            
            if (!markdown || markdown.trim().length === 0) {
                throw new Error(`Post "${slug}" is empty`);
            }

            return this._parseMarkdown(markdown, slug);
            
        } catch (error) {
            console.error(`Error loading post ${slug}:`, error);
            throw error;
        }
    }

    /**
     * Parse markdown frontmatter and body
     */
    _parseMarkdown(markdown, slug) {
        const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
        const match = markdown.match(frontmatterRegex);

        if (!match) {
            throw new Error(`Invalid post format: missing frontmatter for "${slug}"`);
        }

        const frontmatter = match[1];
        const body = match[2];
        const metadata = {};

        frontmatter.split('\n').forEach(line => {
            const trimmed = line.trim();
            if (!trimmed) return;

            const colonIndex = trimmed.indexOf(':');
            if (colonIndex > 0) {
                const key = trimmed.substring(0, colonIndex).trim();
                let value = trimmed.substring(colonIndex + 1).trim();
                
                // Remove quotes
                if ((value.startsWith('"') && value.endsWith('"')) || 
                    (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
                }
                metadata[key] = value;
            }
        });

        if (!metadata.title) {
            throw new Error(`Post "${slug}" missing required title in frontmatter`);
        }

        return {
            slug,
            metadata,
            body,
            raw: markdown
        };
    }

    /**
     * Convert markdown body to HTML
     */
    markdownToHTML(markdown) {
        let html = markdown
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

        // Clean up
        html = html.replace(/<p><\/p>/g, '');
        html = html.replace(/<p>(<h[2-4]>.*<\/h[2-4]>)<\/p>/g, '$1');
        html = html.replace(/<p>(<ul>.*<\/ul>)<\/p>/g, '$1');

        return html;
    }
}

// Create singleton instance
const blogAPI = new BlogAPI();

// Export for browser
if (typeof window !== 'undefined') {
    window.BlogAPI = BlogAPI;
    window.blogAPI = blogAPI;
}

// Export for Node.js (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BlogAPI, blogAPI };
}
