import {
    jsonResponse,
    optionsResponse,
    requireAdmin,
    supabaseFetch,
    slugify,
    parseFrontmatter,
} from '../../lib/admin-api.js';

export async function onRequestOptions() {
    return optionsResponse();
}

export async function onRequestPost(context) {
    const { request, env } = context;
    const gate = await requireAdmin(request, env);
    if (gate.errorResponse) return gate.errorResponse;

    const origin = new URL(request.url).origin;

    try {
        const manifestRes = await fetch(`${origin}/content/blog/manifest.json`);
        if (!manifestRes.ok) {
            return jsonResponse({ error: 'Could not load content/blog/manifest.json' }, 500);
        }
        const manifest = await manifestRes.json();
        if (!Array.isArray(manifest)) {
            return jsonResponse({ error: 'Invalid blog manifest' }, 500);
        }

        let synced = 0;
        const errors = [];

        for (const entry of manifest) {
            const slug = entry.slug;
            if (!slug) continue;

            const mdRes = await fetch(`${origin}/content/blog/${slug}.md`);
            if (!mdRes.ok) {
                errors.push(`${slug}: markdown not found`);
                continue;
            }
            const parsed = parseFrontmatter(await mdRes.text());
            if (!parsed) {
                errors.push(`${slug}: invalid frontmatter`);
                continue;
            }

            const { metadata, body } = parsed;
            const title = metadata.title || slug;
            const summary = metadata.summary || body.slice(0, 200);
            const row = {
                title,
                slug,
                category: metadata.category || 'Mental Health',
                content: body,
                excerpt: summary,
                summary,
                emoji: metadata.emoji || '💜',
                published: String(metadata.published || 'true').toLowerCase() !== 'false',
                status:
                    String(metadata.published || 'true').toLowerCase() !== 'false'
                        ? 'published'
                        : 'draft',
                url: `https://bloomly.co.ke/blog-post/?slug=${encodeURIComponent(slug)}`,
            };

            const patchRes = await supabaseFetch(
                env,
                `posts?slug=eq.${encodeURIComponent(slug)}`,
                { method: 'PATCH', body: JSON.stringify(row) }
            );

            if (patchRes.response.ok) {
                synced += 1;
                continue;
            }

            const insertRes = await supabaseFetch(env, 'posts', {
                method: 'POST',
                body: JSON.stringify(row),
            });

            if (insertRes.response.ok) {
                synced += 1;
            } else {
                errors.push(`${slug}: ${insertRes.data?.message || 'upsert failed'}`);
            }
        }

        return jsonResponse({
            ok: true,
            synced,
            total: manifest.length,
            errors,
        });
    } catch (error) {
        return jsonResponse({ error: error.message || 'Sync failed' }, 500);
    }
}
