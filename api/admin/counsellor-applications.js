import { setCors, verifyAdmin, supabaseFetch } from './_helpers.js';

export default async function handler(req, res) {
    setCors(res);
    if (req.method === 'OPTIONS') return res.status(200).json({ ok: true });

    const auth = await verifyAdmin(req);
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

    try {
        if (req.method === 'GET') {
            const { data } = await supabaseFetch(
                'counsellor_applications?select=*&order=applied_at.desc'
            );
            return res.status(200).json({ applications: data || [] });
        }

        if (req.method === 'PATCH') {
            const { id, status } = req.body || {};
            if (!id || !status) return res.status(400).json({ error: 'Id and status required.' });
            const { response, data } = await supabaseFetch(`counsellor_applications?id=eq.${id}`, {
                method: 'PATCH',
                headers: { Prefer: 'return=representation' },
                body: JSON.stringify({ status }),
            });
            if (!response.ok) return res.status(400).json({ error: 'Update failed' });
            return res.status(200).json({ application: Array.isArray(data) ? data[0] : data });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        return res.status(500).json({ error: error.message || 'Applications API error.' });
    }
}
