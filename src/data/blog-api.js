/**
 * Unified Blog Data API
 * Single source of truth for all blog operations
 * All reads/writes go through GitHub API - no static files, no caching
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
     * Generate cache-busting URL
     * Ensures every request is unique and bypasses all caches
     */
    _cacheBust(url) {
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}_t=${Date.now()}&_r=${Math.random()}`;
    }

    /**
     * Fetch with explicit no-cache headers
     */
    async _fetch(url, options = {}) {
        const bustedUrl = this._cacheBust(url);
        return fetch(bustedUrl, {
            ...options,
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
                ...(options.headers || {})
            }
        });
    }

    /**
     * Get list of all blog posts
     * Returns array of file metadata
     */
    async listPosts() {
        const url = `${this.apiBase}/repos/${this.repoOwner}/${this.repoName}/contents/${this.basePath}?ref=${this.repoBranch}`;
        
        const response = await this._fetch(url, {
            headers: {
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(`Failed to list posts: ${error.message || response.statusText}`);
        }

        const files = await response.json();
        const fileArray = Array.isArray(files) ? files : [files];
        
        return fileArray
            .filter(file => file && file.name && file.name.endsWith('.md') && file.type === 'file')
            .map(file => ({
                name: file.name,
                slug: file.name.replace('.md', ''),
                sha: file.sha,
                size: file.size,
                url: file.download_url
            }));
    }

    /**
     * Get single blog post content
     * Returns parsed markdown with metadata
     */
    async getPost(slug) {
        const filename = `${slug}.md`;
        const url = `${this.rawBase}/${this.repoOwner}/${this.repoName}/${this.repoBranch}/${this.basePath}/${filename}`;
        
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
    }

    /**
     * Get multiple posts in parallel
     */
    async getPosts(slugs) {
        const posts = await Promise.allSettled(
            slugs.map(slug => this.getPost(slug))
        );

        return posts
            .filter(result => result.status === 'fulfilled')
            .map(result => result.value);
    }

    /**
     * Parse markdown frontmatter and body
     */
    _parseMarkdown(markdown, slug) {
        const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
        const match = markdown.match(frontmatterRegex);

        if (!match) {
            throw new Error(`Invalid post format: missing frontmatter`);
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

// Export singleton instance
const blogAPI = new BlogAPI();

// Export for use in other files
if (typeof window !== 'undefined') {
    window.BlogAPI = BlogAPI;
    window.blogAPI = blogAPI;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BlogAPI, blogAPI };
}

