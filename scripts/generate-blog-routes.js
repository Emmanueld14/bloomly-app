/**
 * Generates static blog/{slug}/index.html pages with pre-rendered article content.
 */
const fs = require('fs');
const path = require('path');
const {
    root,
    blogDir,
    normalizeSlug,
    escapeHtml,
    formatDate,
    loadPublishedPosts,
    normalizeAuthorName,
} = require('./blog-build-shared');

const templatePath = path.join(root, 'blog-post', 'index.html');

function estimateReadTime(body) {
    const words = String(body || '').trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 200));
}

function buildPostPage(post, template) {
    const slug = post.slug;
    const title = post.metadata.title || slug;
    const author = normalizeAuthorName(post.metadata.author);
    const dateStr = formatDate(post.metadata.date);
    const category = post.metadata.category || 'Mental Health';
    const readTime = estimateReadTime(post.body);
    const canonical = `https://bloomly.co.ke/blog/${slug}/`;

    return template
        .replace(
            '<link rel="canonical" href="https://bloomly.co.ke/blog/">',
            `<link rel="canonical" href="${canonical}">`
        )
        .replace(
            '<title>Loading... - Bloomly Blog</title>',
            `<title>${escapeHtml(title)} - Bloomly Blog</title>`
        )
        .replace(
            '<div class="post" data-post-id="" hidden aria-hidden="true">',
            `<div class="post" data-post-id="${slug}" data-static-post="true" data-post-category="${escapeHtml(category)}">`
        )
        .replace(
            '<p class="article-byline" id="articleByline" hidden>By <span id="articleAuthorName">Bloomly Team</span></p>',
            `<p class="article-byline" id="articleByline">By <span id="articleAuthorName">${escapeHtml(author)}</span></p>`
        )
        .replace(
            '<h1 id="articleTitle">Loading...</h1>',
            `<h1 id="articleTitle">${escapeHtml(title)}</h1>`
        )
        .replace(
            `<div class="article-meta" id="articleMeta">
                        <span>Loading...</span>
                    </div>`,
            `<div class="article-meta" id="articleMeta">
                        <span>${escapeHtml(dateStr)}</span>
                        <span>•</span>
                        <span>${escapeHtml(category)}</span>
                        <span>•</span>
                        <span>${readTime} min read</span>
                        <span>•</span>
                        <span>By ${escapeHtml(author)}</span>
                    </div>`
        )
        .replace(
            `<div id="articleBody" class="article-body">
                        <p>Loading article...</p>
                    </div>`,
            `<div id="articleBody" class="article-body" data-static-content="true">${post.html}</div>`
        );
}

function main() {
    if (!fs.existsSync(templatePath)) {
        console.warn('Missing blog-post/index.html template — skipping blog route generation.');
        return;
    }

    const template = fs.readFileSync(templatePath, 'utf8');
    const posts = loadPublishedPosts();
    const blogDirOut = path.join(root, 'blog');
    let created = 0;

    posts.forEach((post) => {
        const dir = path.join(blogDirOut, post.slug);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'index.html'), buildPostPage(post, template));
        created += 1;
    });

    console.log(`✅ Generated ${created} static blog post page(s) under /blog/{slug}/`);
}

main();
