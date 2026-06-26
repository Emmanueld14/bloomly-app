import {
    jsonResponse,
    optionsResponse,
    requireAdmin,
    supabaseFetch,
    supabaseFetchList,
    slugify,
} from '../../lib/admin-api.js';

function normalizePostPayload(body, slug) {
    const status = ['draft', 'published', 'scheduled'].includes(body.status)
        ? body.status
        : body.published
          ? 'published'
          : 'draft';
    const excerpt = String(body.excerpt || body.summary || '').trim();
    return {
        title: body.title,
        slug,
        category: body.category || 'Mental Health',
        content: body.content || '',
        content_json: body.content_json || null,
        content_html: body.content_html || null,
        excerpt,
        summary: excerpt,
        emoji: body.emoji || 'Bloomly',
        published: status === 'published',
        status,
        cover_image_url: body.cover_image_url || null,
        tags: Array.isArray(body.tags) ? body.tags : [],
        seo_title: body.seo_title || body.title || null,
        meta_description: body.meta_description || excerpt || null,
        scheduled_at: status === 'scheduled' ? body.scheduled_at || null : null,
        read_time_minutes: Math.max(1, Number(body.read_time_minutes || 1)),
        url: `https://bloomly.co.ke/blog-post/?slug=${encodeURIComponent(slug)}`,
    };
}

export async function onRequestOptions() {
    return optionsResponse();
}

export async function onRequest(context) {
    const { request, env } = context;
    const gate = await requireAdmin(request, env);
    if (gate.errorResponse) return gate.errorResponse;

    const url = new URL(request.url);

    try {
        if (request.method === 'GET') {
            const posts = await supabaseFetchList(env, 'posts', ['created_at', 'updated_at']);
            return jsonResponse({ posts });
        }

        const body = request.method !== 'GET' && request.method !== 'DELETE'
            ? await request.json().catch(() => ({}))
            : {};

        if (request.method === 'POST') {
            const slug = body.slug || slugify(body.title);
            const row = normalizePostPayload(body, slug);
            const { response, data } = await supabaseFetch(env, 'posts', {
                method: 'POST',
                headers: { Prefer: 'return=representation' },
                body: JSON.stringify(row),
            });
            if (!response.ok) {
                return jsonResponse({ error: data?.message || 'Create failed' }, 400);
            }
            return jsonResponse({ post: Array.isArray(data) ? data[0] : data });
        }

        if (request.method === 'PATCH') {
            const id = body.id;
            if (!id) return jsonResponse({ error: 'Post id required.' }, 400);
            const updates = normalizePostPayload(body, body.slug || slugify(body.title));
            const { response, data } = await supabaseFetch(env, `posts?id=eq.${id}`, {
                method: 'PATCH',
                headers: { Prefer: 'return=representation' },
                body: JSON.stringify(updates),
            });
            if (!response.ok) {
                return jsonResponse({ error: data?.message || 'Update failed' }, 400);
            }
            return jsonResponse({ post: Array.isArray(data) ? data[0] : data });
        }

        if (request.method === 'DELETE') {
            const id = url.searchParams.get('id') || body.id;
            if (!id) return jsonResponse({ error: 'Post id required.' }, 400);
            const { response } = await supabaseFetch(env, `posts?id=eq.${id}`, { method: 'DELETE' });
            if (!response.ok) return jsonResponse({ error: 'Delete failed' }, 400);
            return jsonResponse({ ok: true });
        }

        return jsonResponse({ error: 'Method not allowed' }, 405);
    } catch (error) {
        return jsonResponse({ error: error.message || 'Posts API error.' }, 500);
    }
}
