import {
    jsonResponse,
    optionsResponse,
    requireAdmin,
    supabaseFetch,
    supabaseFetchList,
    slugify,
} from '../../lib/admin-api.js';

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
            const row = {
                title: body.title,
                slug,
                category: body.category || 'Mental Health',
                content: body.content || '',
                excerpt: body.excerpt || body.summary || '',
                summary: body.excerpt || body.summary || '',
                emoji: body.emoji || '💜',
                published: Boolean(body.published),
                status: body.published ? 'published' : 'draft',
                url: `https://bloomly.co.ke/blog-post/?slug=${encodeURIComponent(slug)}`,
            };
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
            const updates = { ...body };
            delete updates.id;
            if (updates.published !== undefined) {
                updates.status = updates.published ? 'published' : 'draft';
            }
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
