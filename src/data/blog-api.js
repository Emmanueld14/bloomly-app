/**
 * Bloomly Blog Data API
 * Fast local manifest first; Supabase optional upgrade when available
 */

class BlogAPI {
    constructor() {
        this.localBase = '/content/blog';
        this.localIndex = '/content/blog/index.json';
        this.localManifest = '/content/blog/manifest.json';
        this.siteBase = 'https://bloomly.co.ke';
        this.debug = this._getDebugFlag();
        this._supabase = null;
        this._supabaseLoadPromise = null;
        this._fetchTimeoutMs = 8000;
        this._supabaseTimeoutMs = 2000;
        this._supabaseFastCapMs = 1200;
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

    async _ensureSupabaseClient() {
        if (this._supabase) return this._supabase;

        const url = typeof window !== 'undefined' && window.BLOOMLY_SUPABASE_URL;
        const key = typeof window !== 'undefined' && window.BLOOMLY_SUPABASE_ANON_KEY;
        if (!url || !key) return null;

        if (!window.supabase?.createClient) {
            if (!this._supabaseLoadPromise) {
                this._supabaseLoadPromise = new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
                    script.async = true;
                    script.onload = () => resolve();
                    script.onerror = () => reject(new Error('Failed to load Supabase client'));
                    document.head.appendChild(script);
                });
            }
            try {
                await this._supabaseLoadPromise;
            } catch (error) {
                this._warn(error);
                return null;
            }
        }

        if (!window.supabase?.createClient) return null;
        this._supabase = window.supabase.createClient(url, key);
        return this._supabase;
    }

    async _fetchResource(url, { cacheable = false, timeoutMs } = {}) {
        const controller = new AbortController();
        const ms = timeoutMs ?? this._fetchTimeoutMs;
        const id = setTimeout(() => controller.abort(), ms);
        try {
            const fetchUrl = cacheable
                ? url
                : `${url}${url.includes('?') ? '&' : '?'}_t=${Date.now()}`;
            return await fetch(fetchUrl, {
                signal: controller.signal,
                cache: cacheable ? 'default' : 'no-store',
            });
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

    postPermalink(slug) {
        const normalized = this._normalizeSlug(slug);
        return `/blog-post/?slug=${encodeURIComponent(normalized)}`;
    }

    _rowToListItem(row) {
        const slug = this._normalizeSlug(row.slug);
        return {
            slug,
            name: `${slug}.md`,
            permalink: this.postPermalink(slug),
            metadata: {
                title: row.title,
                date: row.created_at || row.updated_at,
                category: row.category || 'Mental Health',
                summary: row.excerpt || row.summary || row.meta_description || '',
                emoji: row.emoji || '💜',
                published: row.published !== false,
                featuredImage: row.cover_image_url || '',
                tags: row.tags || [],
                seoTitle: row.seo_title || row.title,
                metaDescription: row.meta_description || row.excerpt || row.summary || '',
            },
            body: row.content || this.htmlToText(row.content_html || ''),
            html: row.content_html ? this.sanitizeHTML(row.content_html) : '',
            readTime: row.read_time_minutes || null,
            published: row.published !== false,
        };
    }

    _rowToFullPost(row) {
        const item = this._rowToListItem(row);
        const body = row.content || this.htmlToText(row.content_html || '');
        const html = row.content_html
            ? this.sanitizeHTML(row.content_html)
            : this.markdownToHTML(body);
        return {
            ...item,
            body,
            html,
            content_json: row.content_json || null,
            raw: body,
        };
    }

    async _listSupabasePosts() {
        const client = await this._ensureSupabaseClient();
        if (!client) return null;

        const { data, error } = await client
            .from('posts')
            .select('slug,title,created_at,updated_at,category,excerpt,summary,emoji,published,status,cover_image_url,tags,seo_title,meta_description,read_time_minutes,content_html')
            .eq('published', true)
            .order('created_at', { ascending: false });

        if (error) {
            this._warn('Supabase list error:', error);
            return null;
        }
        if (!data?.length) return [];
        return data.map((row) => this._rowToListItem(row));
    }

    async _listSupabasePostsWithTimeout() {
        try {
            return await Promise.race([
                this._listSupabasePosts(),
                new Promise((resolve) => {
                    setTimeout(() => resolve(null), this._supabaseTimeoutMs);
                }),
            ]);
        } catch (error) {
            this._warn('Supabase list failed:', error);
            return null;
        }
    }

    async _getSupabasePost(slug) {
        const client = await this._ensureSupabaseClient();
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

    async _loadManifestPosts() {
        try {
            const response = await this._fetchResource(this.localManifest, {
                cacheable: true,
                timeoutMs: 5000,
            });
            if (!response.ok) return [];
            const data = await response.json();
            if (!Array.isArray(data)) return [];

            return data
                .filter((entry) => entry?.slug && entry?.metadata?.title)
                .map((entry) => {
                    const slug = this._normalizeSlug(entry.slug);
                    return {
                        slug,
                        name: `${slug}.md`,
                        permalink: this.postPermalink(slug),
                        metadata: entry.metadata,
                        body: '',
                    };
                });
        } catch (error) {
            this._warn('Manifest load failed:', error);
            return [];
        }
    }

    async _loadLocalPostsParallel() {
        const localIndex = await this._tryListLocalPosts();
        if (!localIndex.length) return [];

        const results = await Promise.all(
            localIndex.map(async (file) => {
                try {
                    const post = await this._getLocalPost(file.slug);
                    return post && this._isPublished(post) ? post : null;
                } catch (e) {
                    this._warn('Local post skip:', file.slug, e);
                    return null;
                }
            })
        );
        return results.filter(Boolean);
    }

    async listPosts() {
        const manifestPromise = this._loadManifestPosts();
        const supabasePromise = this._listSupabasePostsWithTimeout();
        const manifestPosts = await manifestPromise;

        let supabasePosts = null;
        if (manifestPosts.length) {
            supabasePosts = await Promise.race([
                supabasePromise,
                new Promise((resolve) => {
                    setTimeout(() => resolve(null), this._supabaseFastCapMs);
                }),
            ]);
        } else {
            supabasePosts = await supabasePromise;
        }

        if (supabasePosts && supabasePosts.length > 0) {
            this._log(`Loaded ${supabasePosts.length} post(s) from Supabase`);
            return supabasePosts;
        }

        if (manifestPosts.length) {
            this._log(`Loaded ${manifestPosts.length} post(s) from manifest`);
            return manifestPosts;
        }

        const localPosts = await this._loadLocalPostsParallel();
        if (localPosts.length) {
            this._log(`Loaded ${localPosts.length} post(s) from local markdown`);
        }
        return localPosts;
    }

    _isPublished(post) {
        const v = String(post?.metadata?.published ?? post?.published ?? 'true').toLowerCase();
        return v !== 'false' && v !== 'draft' && v !== '0';
    }

    async _getSupabasePostWithTimeout(slug) {
        try {
            return await Promise.race([
                this._getSupabasePost(slug),
                new Promise((resolve) => {
                    setTimeout(() => resolve(null), this._supabaseTimeoutMs);
                }),
            ]);
        } catch (error) {
            this._warn('Supabase getPost failed:', error);
            return null;
        }
    }

    async getPost(slug) {
        slug = this._normalizeSlug(slug);
        const [supabasePost, localPost] = await Promise.all([
            this._getSupabasePostWithTimeout(slug),
            this._tryGetLocalPost(slug),
        ]);

        if (supabasePost) return supabasePost;

        if (localPost) {
            return {
                ...localPost,
                html: this.markdownToHTML(localPost.body),
                permalink: this.postPermalink(slug),
            };
        }

        throw new Error(`Post "${slug}" not found`);
    }

    async _tryListLocalPosts() {
        try {
            const response = await this._fetchResource(this.localIndex, { cacheable: true });
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
        const response = await this._fetchResource(url, { cacheable: true });
        if (!response.ok) throw new Error(`Local post not found: ${response.status}`);
        const markdown = await response.text();
        const parsed = this._parseMarkdown(markdown, slug);
        return {
            ...parsed,
            html: this.markdownToHTML(parsed.body),
            permalink: this.postPermalink(slug),
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
        return this.sanitizeHTML(html);
    }

    sanitizeHTML(html) {
        if (!html || typeof document === 'undefined') return '';
        const allowedTags = new Set([
            'a',
            'blockquote',
            'br',
            'code',
            'em',
            'figcaption',
            'figure',
            'h1',
            'h2',
            'h3',
            'h4',
            'hr',
            'img',
            'li',
            'ol',
            'p',
            'pre',
            'span',
            'strong',
            'table',
            'tbody',
            'td',
            'th',
            'thead',
            'tr',
            'u',
            'ul',
        ]);
        const allowedAttrs = new Set([
            'alt',
            'class',
            'colspan',
            'data-align',
            'data-type',
            'data-width',
            'decoding',
            'height',
            'href',
            'loading',
            'rel',
            'rowspan',
            'src',
            'style',
            'target',
            'title',
            'width',
        ]);
        const template = document.createElement('template');
        template.innerHTML = String(html);
        const clean = (element) => {
            Array.from(element.children).forEach(clean);
            const tag = element.tagName.toLowerCase();
            if (!allowedTags.has(tag)) {
                element.replaceWith(...Array.from(element.childNodes));
                return;
            }
            Array.from(element.attributes).forEach((attr) => {
                const name = attr.name.toLowerCase();
                const value = attr.value;
                if (!allowedAttrs.has(name) || name.startsWith('on')) {
                    element.removeAttribute(attr.name);
                    return;
                }
                if ((name === 'href' || name === 'src') && !this.isSafeContentUrl(value)) {
                    element.removeAttribute(attr.name);
                    return;
                }
                if (name === 'style') {
                    const safe = this.sanitizeInlineStyle(value);
                    if (safe) element.setAttribute('style', safe);
                    else element.removeAttribute(attr.name);
                }
            });
            if (tag === 'a') {
                element.setAttribute('rel', 'noopener noreferrer');
                if (element.getAttribute('href')?.startsWith('http')) {
                    element.setAttribute('target', '_blank');
                }
            }
            if (tag === 'img') {
                element.setAttribute('loading', 'lazy');
                element.setAttribute('decoding', 'async');
                if (!element.getAttribute('alt')) element.setAttribute('alt', '');
            }
        };
        Array.from(template.content.children).forEach(clean);
        return template.innerHTML;
    }

    isSafeContentUrl(value) {
        if (!value) return false;
        try {
            const url = new URL(value, window.location.origin);
            return ['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol);
        } catch {
            return false;
        }
    }

    sanitizeInlineStyle(value) {
        return String(value || '')
            .split(';')
            .map((rule) => rule.trim())
            .filter(Boolean)
            .map((rule) => rule.split(':').map((part) => part.trim()))
            .filter(([prop, val]) => {
                if (prop === 'width') return /^(100%|[1-9][0-9]{0,2}px|[1-9][0-9]?%)$/.test(val);
                if (prop === 'text-align') return /^(left|center|right)$/.test(val);
                return false;
            })
            .map(([prop, val]) => `${prop}: ${val}`)
            .join('; ');
    }

    htmlToText(html) {
        if (!html || typeof document === 'undefined') return '';
        const template = document.createElement('template');
        template.innerHTML = this.sanitizeHTML(html);
        return (template.content.textContent || '').replace(/\s+/g, ' ').trim();
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
