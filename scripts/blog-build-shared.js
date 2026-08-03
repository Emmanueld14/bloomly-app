const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const blogDir = path.join(root, 'content', 'blog');

function normalizeSlug(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/\.md$/, '')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function normalizeCategory(value) {
    if (!value) return '';
    return String(value)
        .trim()
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

function parseMarkdownFile(filePath) {
    const markdown = fs.readFileSync(filePath, 'utf8');
    const match = markdown.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
    if (!match) {
        throw new Error(`Invalid markdown frontmatter in ${filePath}`);
    }

    const metadata = {};
    match[1].split('\n').forEach((line) => {
        const colonIndex = line.indexOf(':');
        if (colonIndex <= 0) return;
        const key = line.substring(0, colonIndex).trim();
        let value = line.substring(colonIndex + 1).trim();
        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }
        metadata[key] = value;
    });

    return {
        metadata,
        body: match[2].trim(),
    };
}

function markdownToHTML(markdown) {
    if (!markdown) return '';

    let html = markdown
        .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h2>$1</h2>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/^- (.*$)/gim, '<li>$1</li>')
        .replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/^(.*)$/gm, '<p>$1</p>');

    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<p>(<h[2-4]>[\s\S]*?<\/h[2-4]>)<\/p>/g, '$1');
    html = html.replace(/<p>(<ul>[\s\S]*?<\/ul>)<\/p>/g, '$1');
    return html;
}

function loadPublishedPosts() {
    const indexPath = path.join(blogDir, 'index.json');
    if (!fs.existsSync(indexPath)) return [];

    const files = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    const posts = [];

    files
        .filter((name) => typeof name === 'string' && name.endsWith('.md'))
        .forEach((name) => {
            const slug = normalizeSlug(name);
            const filePath = path.join(blogDir, name);
            if (!slug || !fs.existsSync(filePath)) return;

            const { metadata, body } = parseMarkdownFile(filePath);
            if (!metadata.title) return;
            if (String(metadata.published || 'true').toLowerCase() === 'false') return;

            posts.push({
                slug,
                metadata: {
                    title: metadata.title,
                    date: metadata.date || '',
                    category: metadata.category || 'Mental Health',
                    summary: metadata.summary || '',
                    emoji: metadata.emoji || '💜',
                    author: metadata.author || 'Manuel Muhunami',
                    published: true,
                },
                body,
                html: markdownToHTML(body),
            });
        });

    posts.sort((a, b) => new Date(b.metadata.date || 0) - new Date(a.metadata.date || 0));
    return posts;
}

function buildBlogCardHtml(post) {
    const emoji = post.metadata.emoji || '💜';
    const date = formatDate(post.metadata.date);
    const category = post.metadata.category || 'Mental Health';
    const categorySlug = normalizeCategory(category);
    const slug = post.slug;
    const title = escapeHtml(post.metadata.title || 'Untitled Post');
    const summary = escapeHtml(post.metadata.summary || '');

    return `
                    <article class="blog-card" data-post-id="${slug}" data-category="${categorySlug}">
                        <div class="blog-card-image" style="font-size: var(--text-5xl);">${emoji}</div>
                        <div class="blog-card-content">
                            <div class="blog-card-date">${date} • ${escapeHtml(category)}</div>
                            <h3>${title}</h3>
                            <p class="excerpt blog-card-excerpt">${summary}</p>
                            <a href="/blog/${slug}/" class="blog-card-link">Read More →</a>
                        </div>
                    </article>`;
}

function buildCategoryNavHtml(posts) {
    const seen = new Set(['all']);
    const categories = [{ label: 'All', slug: 'all' }];

    posts.forEach((post) => {
        const label = post.metadata.category || 'Uncategorized';
        const slug = normalizeCategory(label);
        if (!slug || seen.has(slug)) return;
        seen.add(slug);
        categories.push({ label, slug });
    });

    categories.sort((a, b) => {
        if (a.slug === 'all') return -1;
        if (b.slug === 'all') return 1;
        return a.label.localeCompare(b.label);
    });

    return categories.map((category) => {
        const href = category.slug === 'all'
            ? '/blog/'
            : `/blog/?category=${encodeURIComponent(category.slug)}`;
        const activeClass = category.slug === 'all' ? ' is-active' : '';
        return `<a class="blog-category-pill${activeClass}" href="${href}" data-category-slug="${category.slug}">${escapeHtml(category.label)}</a>`;
    }).join('\n                    ');
}

function normalizeAuthorName(value) {
    const author = String(value || '').trim();
    if (!author || author.toLowerCase() === 'bloomly team') return 'Manuel Muhunami';
    if (/^manuel/i.test(author)) return 'Manuel Muhunami';
    return author;
}

const BLOG_CSS_VERSION = '20260804a';

function applyFastBlogHead(html) {
    let output = html;

    output = output.replace(
        /<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">\s*<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin>\s*/g,
        ''
    );
    output = output.replace(
        /<link rel="preload" href="\/content\/blog\/manifest\.json"[^>]*>\s*/g,
        ''
    );
    output = output.replace(
        /<link rel="preload" href="\/styles\.css[^"]*" as="style">\s*/g,
        ''
    );
    output = output.replace(
        /<link href="https:\/\/fonts\.googleapis\.com\/css2[^"]*" rel="stylesheet">\s*/g,
        ''
    );
    output = output.replace(
        /<link rel="stylesheet" href="\/styles\.css[^"]*">\s*/g,
        `<link rel="stylesheet" href="/public/blog-fast.css?v=${BLOG_CSS_VERSION}">\n`
    );
    output = output.replace(/src="\/logo\.png"/g, 'src="/logo.svg"');
    output = output.replace(
        /<!-- bloomly:blog-manifest:start -->[\s\S]*?<!-- bloomly:blog-manifest:end -->\s*/g,
        ''
    );

    return output;
}

function applyFastBlogScripts(html, mode) {
    const indexScripts = `    <script src="/public/blog-filter.js" defer></script>
    <script src="/public/page-shell.js" defer></script>`;
    const postScripts = `    <script src="/public/blog-post-lite.js" defer></script>
    <script src="/public/page-shell.js" defer></script>`;
    const replacement = mode === 'index' ? indexScripts : postScripts;

    return html.replace(
        /<script src="\/public\/blog-shared\.js" defer><\/script>\s*<script src="\/src\/data\/blog-config\.js" defer><\/script>\s*<script src="\/src\/data\/blog-api\.js" defer><\/script>\s*<script src="\/src\/data\/blog-(?:loader|post-loader)\.js" defer><\/script>\s*<script src="\/public\/page-shell\.js" defer><\/script>/,
        replacement
    );
}

function buildShareSectionHtml(title, canonicalUrl) {
    const encodedTitle = encodeURIComponent(title);
    const encodedUrl = encodeURIComponent(canonicalUrl);
    return `<div class="post-share-row" data-post-share>
                        <span>Share this:</span>
                        <a class="share-pill" href="https://wa.me/?text=${encodedTitle}%20${encodedUrl}" target="_blank" rel="noopener noreferrer">Share on WhatsApp</a>
                        <a class="share-pill" href="https://twitter.com/intent/tweet?text=${encodedTitle}&amp;url=${encodedUrl}" target="_blank" rel="noopener noreferrer">Share on X</a>
                        <button type="button" class="share-pill" data-copy-link>Copy link</button>
                    </div>`;
}

function buildRelatedPostsHtml(currentSlug, category, posts) {
    const sameCategory = posts.filter((post) =>
        post.slug !== currentSlug &&
        normalizeCategory(post.metadata.category) === normalizeCategory(category)
    );
    const fallback = posts.filter((post) => post.slug !== currentSlug);
    const related = (sameCategory.length ? sameCategory : fallback).slice(0, 3);
    if (!related.length) {
        return { sectionHtml: '', visible: false };
    }

    const cards = related.map((post) => buildBlogCardHtml(post)).join('');
    return {
        sectionHtml: cards,
        visible: true,
    };
}

module.exports = {
    blogDir,
    root,
    normalizeSlug,
    normalizeCategory,
    escapeHtml,
    formatDate,
    parseMarkdownFile,
    markdownToHTML,
    loadPublishedPosts,
    buildBlogCardHtml,
    buildCategoryNavHtml,
    normalizeAuthorName,
    BLOG_CSS_VERSION,
    applyFastBlogHead,
    applyFastBlogScripts,
    buildShareSectionHtml,
    buildRelatedPostsHtml,
};
