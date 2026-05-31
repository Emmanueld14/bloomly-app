import { setCors, verifyAdmin, supabaseFetch } from './_helpers.js';

function slugify(title) {
    return String(title || '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
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
                url: `https://bloomly.co.ke/blog/${slug}`,
            };
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
            const updates = { ...body };
            delete updates.id;
            if (updates.published !== undefined) {
                updates.status = updates.published ? 'published' : 'draft';
            }
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
