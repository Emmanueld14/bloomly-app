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

function validatePostPayload(row, { publish = false } = {}) {
    const errors = [];
    if (!row.title || !String(row.title).trim()) errors.push('Title is required.');
    if (!row.slug || !String(row.slug).trim()) errors.push('Slug is required.');
    if (publish) {
        const hasText = Boolean(String(row.content || '').trim());
        const hasImage = /<img\s/i.test(row.content_html || '');
        if (!hasText && !hasImage) errors.push('Content is required before publishing.');
    }
    if (row.status === 'scheduled' && !row.scheduled_at) {
        errors.push('Scheduled posts require a scheduled_at date.');
    }
    if (errors.length) {
        return errors.join(' ');
    }
    return null;
}

async function verifyPersistedPost(env, id, expected) {
    const { response, data } = await supabaseFetch(
        env,
        `posts?id=eq.${encodeURIComponent(id)}&select=*`,
        { method: 'GET' }
    );
    if (!response.ok || !Array.isArray(data) || !data[0]) {
        throw new Error(data?.message || 'Post write could not be verified in Supabase.');
    }
    const post = data[0];
    if (expected.published && !(post.published === true || post.status === 'published')) {
        throw new Error('Post saved, but Supabase did not persist published=true/status=published.');
    }
    if (post.slug !== expected.slug) {
        throw new Error('Post saved with an unexpected slug. Please reload and try again.');
    }
    return post;
}

function postResponse(post, action) {
    return jsonResponse({
        post,
        verified: true,
        action,
        published: post.published === true || post.status === 'published',
        frontend: {
            blogUrl: `https://bloomly.co.ke/blog/?fresh=${Date.now()}`,
            postUrl: `https://bloomly.co.ke/blog-post/?slug=${encodeURIComponent(post.slug)}&fresh=${Date.now()}`,
        },
    });
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
            const validationError = validatePostPayload(row, { publish: row.published });
            if (validationError) return jsonResponse({ error: validationError }, 400);
            const { response, data } = await supabaseFetch(env, 'posts', {
                method: 'POST',
                headers: { Prefer: 'return=representation' },
                body: JSON.stringify(row),
            });
            if (!response.ok) {
                return jsonResponse({ error: data?.message || 'Create failed' }, 400);
            }
            const inserted = Array.isArray(data) ? data[0] : data;
            const verified = await verifyPersistedPost(env, inserted.id, row);
            return postResponse(verified, 'created');
        }

        if (request.method === 'PATCH') {
            const id = body.id;
            if (!id) return jsonResponse({ error: 'Post id required.' }, 400);
            const updates = normalizePostPayload(body, body.slug || slugify(body.title));
            const validationError = validatePostPayload(updates, { publish: updates.published });
            if (validationError) return jsonResponse({ error: validationError }, 400);
            const { response, data } = await supabaseFetch(env, `posts?id=eq.${id}`, {
                method: 'PATCH',
                headers: { Prefer: 'return=representation' },
                body: JSON.stringify(updates),
            });
            if (!response.ok) {
                return jsonResponse({ error: data?.message || 'Update failed' }, 400);
            }
            const updated = Array.isArray(data) ? data[0] : data;
            const verified = await verifyPersistedPost(env, updated.id || id, updates);
            return postResponse(verified, 'updated');
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
