/**
 * Build-time manifest of blog post metadata for fast listing (one JSON fetch).
 */
const fs = require('fs');
const path = require('path');
const { blogDir, loadPublishedPosts } = require('./blog-build-shared');

const outPath = path.join(blogDir, 'manifest.json');

function main() {
    const posts = loadPublishedPosts();
    if (!posts.length) {
        console.warn('No published posts found — skipping manifest generation.');
        return;
    }

    const manifest = posts.map((post) => ({
        slug: post.slug,
        metadata: {
            title: post.metadata.title,
            date: post.metadata.date || '',
            category: post.metadata.category || 'Mental Health',
            summary: post.metadata.summary || '',
            emoji: post.metadata.emoji || '💜',
            published: post.metadata.published !== false,
        },
    }));

    fs.writeFileSync(outPath, JSON.stringify(manifest, null, 0));
    console.log(`✅ Generated manifest with ${manifest.length} post(s) at content/blog/manifest.json`);
}

main();
