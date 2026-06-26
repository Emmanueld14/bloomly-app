import { setCors, verifyAdmin, supabaseFetch } from './_helpers.js';

function slugify(title) {
    return String(title || '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

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
    return errors.length ? errors.join(' ') : null;
}

async function verifyPersistedPost(id, expected) {
    const { response, data } = await supabaseFetch(`posts?id=eq.${encodeURIComponent(id)}&select=*`);
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

function postResponse(res, post, action) {
    return res.status(200).json({
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

export default async function handler(req, res) {
    setCors(res);
    if (req.method === 'OPTIONS') return res.status(200).json({ ok: true });

    const auth = await verifyAdmin(req);
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

    try {
        if (req.method === 'GET') {
            const { data } = await supabaseFetch('posts?select=*&order=created_at.desc');
            return res.status(200).json({ posts: data || [] });
        }

        if (req.method === 'POST') {
            const body = req.body || {};
            const slug = body.slug || slugify(body.title);
            const row = normalizePostPayload(body, slug);
            const validationError = validatePostPayload(row, { publish: row.published });
            if (validationError) return res.status(400).json({ error: validationError });
            const { response, data } = await supabaseFetch('posts', {
                method: 'POST',
                headers: { Prefer: 'return=representation' },
                body: JSON.stringify(row),
            });
            if (!response.ok) return res.status(400).json({ error: data?.message || 'Create failed' });
            const inserted = Array.isArray(data) ? data[0] : data;
            const verified = await verifyPersistedPost(inserted.id, row);
            return postResponse(res, verified, 'created');
        }

        if (req.method === 'PATCH') {
            const body = req.body || {};
            const id = body.id;
            if (!id) return res.status(400).json({ error: 'Post id required.' });
            const updates = normalizePostPayload(body, body.slug || slugify(body.title));
            const validationError = validatePostPayload(updates, { publish: updates.published });
            if (validationError) return res.status(400).json({ error: validationError });
            const { response, data } = await supabaseFetch(`posts?id=eq.${id}`, {
                method: 'PATCH',
                headers: { Prefer: 'return=representation' },
                body: JSON.stringify(updates),
            });
            if (!response.ok) return res.status(400).json({ error: data?.message || 'Update failed' });
            const updated = Array.isArray(data) ? data[0] : data;
            const verified = await verifyPersistedPost(updated.id || id, updates);
            return postResponse(res, verified, 'updated');
        }

        if (req.method === 'DELETE') {
            const id = req.query?.id || req.body?.id;
            if (!id) return res.status(400).json({ error: 'Post id required.' });
            const { response } = await supabaseFetch(`posts?id=eq.${id}`, { method: 'DELETE' });
            if (!response.ok) return res.status(400).json({ error: 'Delete failed' });
            return res.status(200).json({ ok: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        return res.status(500).json({ error: error.message || 'Posts API error.' });
    }
}
