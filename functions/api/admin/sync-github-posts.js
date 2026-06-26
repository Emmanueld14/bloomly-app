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

            const existingRes = await supabaseFetch(
                env,
                `posts?slug=eq.${encodeURIComponent(slug)}&select=id,content_json,content_html`,
                { method: 'GET' }
            );
            const existing = Array.isArray(existingRes.data) ? existingRes.data[0] : null;

            if (existing?.content_json || existing?.content_html) {
                continue;
            }

            if (existing?.id) {
                const patchRes = await supabaseFetch(
                    env,
                    `posts?id=eq.${encodeURIComponent(existing.id)}`,
                    { method: 'PATCH', body: JSON.stringify(row) }
                );
                if (!patchRes.response.ok) {
                    const msg = patchRes.data?.message || patchRes.data?.hint || 'update failed';
                    errors.push(`${slug}: ${msg}`);
                    continue;
                }
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
                const msg = insertRes.data?.message || insertRes.data?.hint || 'upsert failed';
                errors.push(`${slug}: ${msg}`);
            }
        }

        const schemaMissing = errors.some((e) =>
            /category.*schema cache|Could not find the 'category' column/i.test(e)
        );

        return jsonResponse({
            ok: synced > 0 || errors.length === 0,
            synced,
            total: manifest.length,
            errors,
            ...(schemaMissing
                ? {
                      schemaFixRequired: true,
                      schemaFixHint:
                          'Run supabase/migrations/202606010001_ensure_posts_cms_columns.sql in the Supabase SQL Editor (or supabase db push), then click Import again.',
                  }
                : {}),
        });
    } catch (error) {
        return jsonResponse({ error: error.message || 'Sync failed' }, 500);
    }
}
