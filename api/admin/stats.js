import { setCors, verifyAdmin, supabaseFetch } from './_helpers.js';

export default async function handler(req, res) {
    setCors(res);
    if (req.method === 'OPTIONS') return res.status(200).json({ ok: true });
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const auth = await verifyAdmin(req);
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

    try {
        const [posts, subscribers, bookings, counsellors] = await Promise.all([
            supabaseFetch('posts?select=id', { headers: { Prefer: 'count=exact' } }),
            supabaseFetch('subscribers?select=id', { headers: { Prefer: 'count=exact' } }),
            supabaseFetch('bookings?select=id', { headers: { Prefer: 'count=exact' } }),
            supabaseFetch('counsellor_applications?status=eq.pending&select=id', { headers: { Prefer: 'count=exact' } }),
        ]);

        const countFrom = (r) => Number(r.response.headers.get('content-range')?.split('/')[1] || 0);

        const recentBookings = await supabaseFetch(
            'bookings?select=*&order=booked_at.desc&limit=5'
        );
        const recentSubscribers = await supabaseFetch(
            'subscribers?select=*&order=created_at.desc&limit=5'
        );

        return res.status(200).json({
            counts: {
                posts: countFrom(posts),
                subscribers: countFrom(subscribers),
                bookings: countFrom(bookings),
                counsellorApplicationsPending: countFrom(counsellors),
            },
            recentBookings: recentBookings.data || [],
            recentSubscribers: recentSubscribers.data || [],
        });
    } catch (error) {
        return res.status(500).json({ error: error.message || 'Unable to load stats.' });
    }
}
