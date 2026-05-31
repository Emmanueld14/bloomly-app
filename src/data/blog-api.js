/**
 * Bloomly Blog Data API
 * Supabase posts (primary) with local markdown fallback
 */

class BlogAPI {
    constructor() {
        this.localBase = '/content/blog';
        this.localIndex = '/content/blog/index.json';
        this.siteBase = 'https://bloomly.co.ke';
        this.debug = this._getDebugFlag();
        this._supabase = null;
        this._fetchTimeoutMs = 15000;
    }

    _getDebugFlag() {
        if (typeof window === 'undefined') return false;
        try {
            return window.localStorage?.getItem('bloomly:blog-debug') === 'true';
        } catch {
            return false;
        }
    }

    _log(...args) {
        if (this.debug) console.log(...args);
    }

    _warn(...args) {
        if (this.debug) console.warn(...args);
    }

    _getSupabase() {
        if (this._supabase) return this._supabase;
        const url = typeof window !== 'undefined' && window.BLOOMLY_SUPABASE_URL;
        const key = typeof window !== 'undefined' && window.BLOOMLY_SUPABASE_ANON_KEY;
        if (!window.supabase?.createClient || !url || !key) return null;
        this._supabase = window.supabase.createClient(url, key);
        return this._supabase;
    }

    async _fetchWithTimeout(url, options = {}) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), this._fetchTimeoutMs);
        try {
            const sep = url.includes('?') ? '&' : '?';
            const busted = `${url}${sep}_t=${Date.now()}`;
            return await fetch(busted, { ...options, signal: controller.signal, cache: 'no-store' });
        } finally {
            clearTimeout(id);
        }
    }

    _normalizeSlug(value) {
        return String(value || '')
            .trim()
            .toLowerCase()
            .replace(/\.md$/, '')
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    _rowToListItem(row) {
        const slug = this._normalizeSlug(row.slug);
        return {
            slug,
            name: `${slug}.md`,
            permalink: `/blog/${encodeURIComponent(slug)}`,
            metadata: {
                title: row.title,
                date: row.created_at || row.updated_at,
                category: row.category || 'Mental Health',
                summary: row.excerpt || row.summary || '',
                emoji: row.emoji || '💜',
                published: row.published !== false,
            },
            body: row.content || '',
            published: row.published !== false,
        };
    }

    _rowToFullPost(row) {
        const item = this._rowToListItem(row);
        const body = row.content || '';
        return {
            ...item,
            body,
            html: this.markdownToHTML(body),
            raw: body,
        };
    }

    async _listSupabasePosts() {
        const client = this._getSupabase();
        if (!client) return null;

        const { data, error } = await client
            .from('posts')
            .select('*')
            .eq('published', true)
            .order('created_at', { ascending: false });

        if (error) {
            this._warn('Supabase list error:', error);
            return null;
        }
        if (!data?.length) return [];
        return data.map((row) => this._rowToListItem(row));
    }

    async _getSupabasePost(slug) {
        const client = this._getSupabase();
        if (!client) return null;

        const { data, error } = await client
            .from('posts')
            .select('*')
            .eq('slug', slug)
            .eq('published', true)
            .maybeSingle();

        if (error || !data) return null;
        return this._rowToFullPost(data);
    }

    async listPosts() {
        const supabasePosts = await this._listSupabasePosts();
        if (supabasePosts && supabasePosts.length > 0) {
            this._log(`Loaded ${supabasePosts.length} post(s) from Supabase`);
            return supabasePosts;
        }

        const localPosts = await this._tryListLocalPosts();
        if (localPosts.length) {
            const enriched = [];
            for (const file of localPosts) {
                try {
                    const post = await this._getLocalPost(file.slug);
                    if (post && this._isPublished(post)) enriched.push(post);
                } catch (e) {
                    this._warn('Local post skip:', file.slug, e);
                }
            }
            return enriched;
        }
        return [];
    }

    _isPublished(post) {
        const v = String(post?.metadata?.published ?? post?.published ?? 'true').toLowerCase();
        return v !== 'false' && v !== 'draft' && v !== '0';
    }

    async getPost(slug) {
        slug = this._normalizeSlug(slug);
        const supabasePost = await this._getSupabasePost(slug);
        if (supabasePost) return supabasePost;

        const localPost = await this._tryGetLocalPost(slug);
        if (localPost) return localPost;

        throw new Error(`Post "${slug}" not found`);
    }

    async _tryListLocalPosts() {
        try {
            const response = await this._fetchWithTimeout(this.localIndex);
            if (!response.ok) return [];
            const data = await response.json();
            return (Array.isArray(data) ? data : [])
                .filter((name) => typeof name === 'string' && name.endsWith('.md'))
                .map((name) => ({
                    name,
                    slug: this._normalizeSlug(name),
                }));
        } catch {
            return [];
        }
    }

    async _tryGetLocalPost(slug) {
        try {
            return await this._getLocalPost(slug);
        } catch {
            return null;
        }
    }

    async _getLocalPost(slug) {
        const url = `${this.localBase}/${slug}.md`;
        const response = await this._fetchWithTimeout(url);
        if (!response.ok) throw new Error(`Local post not found: ${response.status}`);
        const markdown = await response.text();
        const parsed = this._parseMarkdown(markdown, slug);
        return {
            ...parsed,
            html: this.markdownToHTML(parsed.body),
            permalink: `/blog/${encodeURIComponent(slug)}`,
        };
    }

    _parseMarkdown(markdown, slug) {
        const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
        const match = markdown.match(frontmatterRegex);
        if (!match) throw new Error(`Invalid post format: "${slug}"`);

        const metadata = {};
        match[1].split('\n').forEach((line) => {
            const colonIndex = line.indexOf(':');
            if (colonIndex > 0) {
                const key = line.substring(0, colonIndex).trim();
                let value = line.substring(colonIndex + 1).trim();
                if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
                }
                metadata[key] = value;
            }
        });

        if (!metadata.title) throw new Error(`Post "${slug}" missing title`);

        return {
            slug,
            metadata,
            body: match[2],
            raw: markdown,
        };
    }

    markdownToHTML(markdown) {
        if (!markdown) return '';
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

        html = html.replace(/<p><\/p>/g, '');
        html = html.replace(/<p>(<h[2-4]>.*<\/h[2-4]>)<\/p>/g, '$1');
        html = html.replace(/<p>(<ul>.*<\/ul>)<\/p>/g, '$1');
        return html;
    }
}

const blogAPI = new BlogAPI();

if (typeof window !== 'undefined') {
    window.BlogAPI = BlogAPI;
    window.blogAPI = blogAPI;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BlogAPI, blogAPI };
}
