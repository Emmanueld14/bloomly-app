/**
 * Generates static blog/{slug}/index.html pages from the shared post template
 * so /blog/:slug/ is the canonical article URL.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const indexPath = path.join(root, 'content', 'blog', 'index.json');
const templatePath = path.join(root, 'blog-post', 'index.html');

function normalizeSlug(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/\.md$/, '')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function buildPostPage(slug, template) {
    const canonical = `https://bloomly.co.ke/blog/${slug}/`;
    return template.replace(
        '<link rel="canonical" href="https://bloomly.co.ke/blog/">',
        `<link rel="canonical" href="${canonical}">`
    );
}

function main() {
    if (!fs.existsSync(indexPath)) {
        console.warn('No content/blog/index.json — skipping blog route generation.');
        return;
    }

    if (!fs.existsSync(templatePath)) {
        console.warn('Missing blog-post/index.html template — skipping blog route generation.');
        return;
    }

    const template = fs.readFileSync(templatePath, 'utf8');
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
        fs.writeFileSync(out, buildPostPage(slug, template));
        created += 1;
    });

    console.log(`✅ Generated ${created} blog post page(s) under /blog/{slug}/`);
}

main();
