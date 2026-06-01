/**
 * Build-time manifest of blog post metadata for fast listing (one JSON fetch).
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const blogDir = path.join(root, 'content', 'blog');
const indexPath = path.join(blogDir, 'index.json');
const outPath = path.join(blogDir, 'manifest.json');

function normalizeSlug(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/\.md$/, '')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function parseFrontmatter(markdown) {
    const match = markdown.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
    if (!match) return {};

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
    return metadata;
}

function main() {
    if (!fs.existsSync(indexPath)) {
        console.warn('No content/blog/index.json — skipping manifest generation.');
        return;
    }

    const files = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    const posts = [];

    files
        .filter((name) => typeof name === 'string' && name.endsWith('.md'))
        .forEach((name) => {
            const slug = normalizeSlug(name);
            const filePath = path.join(blogDir, name);
            if (!slug || !fs.existsSync(filePath)) return;

            const markdown = fs.readFileSync(filePath, 'utf8');
            const metadata = parseFrontmatter(markdown);
            if (!metadata.title) return;

            posts.push({
                slug,
                metadata: {
                    title: metadata.title,
                    date: metadata.date || '',
                    category: metadata.category || 'Mental Health',
                    summary: metadata.summary || '',
                    emoji: metadata.emoji || '💜',
                    published: metadata.published !== 'false',
                },
            });
        });

    posts.sort((a, b) => new Date(b.metadata.date || 0) - new Date(a.metadata.date || 0));
    fs.writeFileSync(outPath, JSON.stringify(posts, null, 0));
    console.log(`✅ Generated manifest with ${posts.length} post(s) at content/blog/manifest.json`);
}

main();
