/**
 * Pre-renders blog listing HTML so posts appear before JavaScript runs.
 */
const fs = require('fs');
const path = require('path');
const {
    root,
    loadPublishedPosts,
    buildBlogCardHtml,
    buildCategoryNavHtml,
    applyFastBlogHead,
    applyFastBlogScripts,
} = require('./blog-build-shared');

const blogIndexPath = path.join(root, 'blog', 'index.html');

function replaceBetweenMarkers(source, startMarker, endMarker, replacement) {
    const start = source.indexOf(startMarker);
    const end = source.indexOf(endMarker);
    if (start === -1 || end === -1 || end < start) {
        throw new Error(`Missing markers ${startMarker} / ${endMarker} in blog/index.html`);
    }
    return `${source.slice(0, start + startMarker.length)}${replacement}${source.slice(end)}`;
}

function main() {
    const posts = loadPublishedPosts();
    if (!posts.length) {
        console.warn('No published posts found — skipping blog index generation.');
        return;
    }

    let html = fs.readFileSync(blogIndexPath, 'utf8');
    const cardsHtml = posts.map(buildBlogCardHtml).join('');
    const categoriesHtml = buildCategoryNavHtml(posts);
    html = replaceBetweenMarkers(
        html,
        '<!-- bloomly:blog-posts:start -->',
        '<!-- bloomly:blog-posts:end -->',
        cardsHtml
    );

    html = replaceBetweenMarkers(
        html,
        '<!-- bloomly:blog-categories:start -->',
        '<!-- bloomly:blog-categories:end -->',
        `\n                    ${categoriesHtml}\n                `
    );

    if (!html.includes('data-static-blog-grid="true"')) {
        html = html.replace(
            '<div class="blog-grid" id="blogGrid">',
            '<div class="blog-grid" id="blogGrid" data-static-blog-grid="true">'
        );
    }

    html = applyFastBlogHead(html);
    html = applyFastBlogScripts(html, 'index');

    fs.writeFileSync(blogIndexPath, html);
    console.log(`✅ Pre-rendered ${posts.length} blog card(s) in blog/index.html`);
}

main();
