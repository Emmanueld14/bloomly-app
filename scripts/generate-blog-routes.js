/**
 * Generates static blog/{slug}/index.html stubs so /blog/:slug works
 * without relying on Cloudflare _redirects (which may not apply on deploy).
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const indexPath = path.join(root, 'content', 'blog', 'index.json');

function normalizeSlug(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/\.md$/, '')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function buildStubHtml(slug) {
    const target = `/blog-post/?slug=${encodeURIComponent(slug)}`;
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="canonical" href="${target}">
    <meta http-equiv="refresh" content="0;url=${target}">
    <title>Opening article…</title>
    <script>location.replace(${JSON.stringify(target)});</script>
</head>
<body>
    <p>Opening article… <a href="${target}">Continue</a></p>
</body>
</html>
`;
}

function main() {
    if (!fs.existsSync(indexPath)) {
        console.warn('No content/blog/index.json — skipping blog route generation.');
        return;
    }

    const files = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    const slugs = files
        .filter((name) => typeof name === 'string' && name.endsWith('.md'))
        .map((name) => normalizeSlug(name))
        .filter(Boolean);

    const blogDir = path.join(root, 'blog');
    let created = 0;

    slugs.forEach((slug) => {
        const dir = path.join(blogDir, slug);
        fs.mkdirSync(dir, { recursive: true });
        const out = path.join(dir, 'index.html');
        fs.writeFileSync(out, buildStubHtml(slug));
        created += 1;
    });

    console.log(`✅ Generated ${created} blog post route stub(s) under /blog/{slug}/`);
}

main();
