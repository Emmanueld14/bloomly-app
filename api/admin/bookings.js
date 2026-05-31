import { setCors, verifyAdmin, supabaseFetch } from './_helpers.js';

export default async function handler(req, res) {
    setCors(res);
    if (req.method === 'OPTIONS') return res.status(200).json({ ok: true });

    const auth = await verifyAdmin(req);
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

    try {
        if (req.method === 'GET') {
            const status = req.query?.status;
            let path = 'bookings?select=*&order=booked_at.desc';
            if (status && status !== 'all') {
                path += `&payment_status=eq.${encodeURIComponent(status)}`;
            }
            const { data } = await supabaseFetch(path);
            return res.status(200).json({ bookings: data || [] });
        }

        if (req.method === 'PATCH') {
            const { id, payment_status } = req.body || {};
            if (!id) return res.status(400).json({ error: 'Booking id required.' });
            const { response, data } = await supabaseFetch(`bookings?id=eq.${id}`, {
                method: 'PATCH',
                headers: { Prefer: 'return=representation' },
                body: JSON.stringify({ payment_status: payment_status || 'confirmed' }),
            });
            if (!response.ok) return res.status(400).json({ error: 'Update failed' });
            return res.status(200).json({ booking: Array.isArray(data) ? data[0] : data });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        return res.status(500).json({ error: error.message || 'Bookings API error.' });
    }
}
