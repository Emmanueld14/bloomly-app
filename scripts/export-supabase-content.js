#!/usr/bin/env node
/**
 * Export published Supabase CMS posts into static build sources.
 *
 * - Blog posts -> content/blog/supabase-posts.json
 * - Resource guides -> merged into content/resources/guides.json
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 * Skips gracefully when credentials are missing (local builds without Supabase).
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const blogExportPath = path.join(root, 'content', 'blog', 'supabase-posts.json');
const guidesPath = path.join(root, 'content', 'resources', 'guides.json');

function normalizeSlug(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function stripHtml(value) {
    return String(value || '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function formatReadTime(minutes, body) {
    const fromField = Number(minutes);
    if (Number.isFinite(fromField) && fromField > 0) {
        return `${fromField} min`;
    }
    const words = stripHtml(body).split(/\s+/).filter(Boolean).length;
    return `${Math.max(1, Math.ceil(words / 200))} min`;
}

function isPublished(row) {
    return row.published === true || row.status === 'published';
}

async function fetchPublishedPosts(url, key) {
    const query = new URL(`${url.replace(/\/$/, '')}/rest/v1/posts`);
    query.searchParams.set(
        'select',
        'slug,title,created_at,updated_at,category,category_slug,excerpt,summary,emoji,content,content_html,takeaways,read_time_minutes,content_type,published,status'
    );
    query.searchParams.set('or', '(published.eq.true,status.eq.published)');
    query.searchParams.set('order', 'created_at.desc');

    const response = await fetch(query.toString(), {
        headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
        },
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Supabase export failed (${response.status}): ${text.slice(0, 240)}`);
    }

    const rows = await response.json();
    return Array.isArray(rows) ? rows.filter(isPublished) : [];
}

function mapBlogPost(row) {
    const slug = normalizeSlug(row.slug);
    if (!slug || !row.title) return null;

    const summary = String(row.excerpt || row.summary || stripHtml(row.content_html || row.content || '')).trim();
    const html = String(row.content_html || '').trim();
    const body = String(row.content || stripHtml(html)).trim();

    return {
        slug,
        metadata: {
            title: String(row.title).trim(),
            date: row.created_at || row.updated_at || new Date().toISOString(),
            category: row.category || 'Mental Health',
            summary: summary.slice(0, 220),
            emoji: row.emoji || '💜',
            author: 'Manuel Muhunami',
            published: true,
            source: 'supabase',
        },
        body,
        html: html || undefined,
    };
}

function mapResourceGuide(row) {
    const slug = normalizeSlug(row.slug);
    if (!slug || !row.title) return null;

    const body = String(row.content_html || row.content || '').trim();
    const takeaways = Array.isArray(row.takeaways)
        ? row.takeaways.map((item) => String(item || '').trim()).filter(Boolean)
        : [];

    return {
        slug,
        title: String(row.title).trim(),
        category: row.category || 'Mental wellness',
        categorySlug: row.category_slug || 'wellness',
        emoji: row.emoji || '💜',
        readTime: formatReadTime(row.read_time_minutes, body),
        summary: String(row.excerpt || row.summary || stripHtml(body)).trim().slice(0, 240),
        takeaways,
        body,
        source: 'supabase',
    };
}

function mergeGuides(existing, exported) {
    const merged = new Map();
    (existing || []).forEach((guide) => {
        if (guide?.slug) merged.set(guide.slug, guide);
    });
    exported.forEach((guide) => {
        merged.set(guide.slug, guide);
    });
    return Array.from(merged.values()).sort((a, b) => a.title.localeCompare(b.title));
}

function runStaticGenerators() {
    const steps = [
        'scripts/build-blog-css.js',
        'scripts/generate-blog-manifest.js',
        'scripts/generate-blog-index.js',
        'scripts/generate-blog-routes.js',
        'scripts/generate-resources.js',
    ];

    steps.forEach((script) => {
        execFileSync(process.execPath, [path.join(root, script)], {
            cwd: root,
            stdio: 'inherit',
        });
    });
}

async function main() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

    if (!url || !key) {
        console.warn('⚠️  Skipping Supabase export (set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY).');
        return;
    }

    const rows = await fetchPublishedPosts(url, key);
    const blogPosts = rows
        .filter((row) => row.content_type !== 'resource_guide')
        .map(mapBlogPost)
        .filter(Boolean);
    const resourceGuides = rows
        .filter((row) => row.content_type === 'resource_guide')
        .map(mapResourceGuide)
        .filter(Boolean);

    fs.mkdirSync(path.dirname(blogExportPath), { recursive: true });
    fs.writeFileSync(blogExportPath, `${JSON.stringify(blogPosts, null, 2)}\n`);

    const existingGuides = fs.existsSync(guidesPath)
        ? JSON.parse(fs.readFileSync(guidesPath, 'utf8'))
        : [];
    const mergedGuides = mergeGuides(existingGuides, resourceGuides);
    fs.writeFileSync(guidesPath, `${JSON.stringify(mergedGuides, null, 2)}\n`);

    console.log(`✅ Exported ${blogPosts.length} blog post(s) to content/blog/supabase-posts.json`);
    console.log(`✅ Merged ${resourceGuides.length} resource guide(s) into content/resources/guides.json (${mergedGuides.length} total)`);

    if (process.env.SKIP_STATIC_GENERATE === '1') {
        return;
    }

    console.log('🔨 Regenerating static blog and resource pages...');
    runStaticGenerators();
}

main().catch((error) => {
    console.error('Supabase export failed:', error.message || error);
    process.exit(1);
});
