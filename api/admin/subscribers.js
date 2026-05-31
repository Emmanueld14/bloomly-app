import { setCors, verifyAdmin, supabaseFetch } from './_helpers.js';

export default async function handler(req, res) {
    setCors(res);
    if (req.method === 'OPTIONS') return res.status(200).json({ ok: true });

    const auth = await verifyAdmin(req);
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

    try {
        if (req.method === 'GET') {
            const { data } = await supabaseFetch('subscribers?select=*&order=created_at.desc');
            return res.status(200).json({ subscribers: data || [] });
        }

        if (req.method === 'DELETE') {
            const id = req.query?.id || req.body?.id;
            if (!id) return res.status(400).json({ error: 'Subscriber id required.' });
            const { response } = await supabaseFetch(`subscribers?id=eq.${id}`, { method: 'DELETE' });
            if (!response.ok) return res.status(400).json({ error: 'Delete failed' });
            return res.status(200).json({ ok: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        return res.status(500).json({ error: error.message || 'Subscribers API error.' });
    }
}
