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
            const { response, data } = await supabaseFetch('posts', {
                method: 'POST',
                headers: { Prefer: 'return=representation' },
                body: JSON.stringify(row),
            });
            if (!response.ok) return res.status(400).json({ error: data?.message || 'Create failed' });
            return res.status(200).json({ post: Array.isArray(data) ? data[0] : data });
        }

        if (req.method === 'PATCH') {
            const body = req.body || {};
            const id = body.id;
            if (!id) return res.status(400).json({ error: 'Post id required.' });
            const updates = normalizePostPayload(body, body.slug || slugify(body.title));
            const { response, data } = await supabaseFetch(`posts?id=eq.${id}`, {
                method: 'PATCH',
                headers: { Prefer: 'return=representation' },
                body: JSON.stringify(updates),
            });
            if (!response.ok) return res.status(400).json({ error: data?.message || 'Update failed' });
            return res.status(200).json({ post: Array.isArray(data) ? data[0] : data });
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
