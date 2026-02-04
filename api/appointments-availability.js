import {
    setCors,
    getEnvConfig,
    ensureConfig,
    supabaseRequest,
    loadSettings,
    loadBlackouts
} from './appointments-helpers.js';

function toDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export default async function handler(req, res) {
    setCors(res);
    if (req.method === 'OPTIONS') {
        return res.status(200).json({ message: 'OK' });
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const config = getEnvConfig();
    const configError = ensureConfig(config, ['supabaseUrl', 'supabaseServiceKey']);
    if (configError) {
        return res.status(500).json({ error: configError });
    }

    try {
        const start = req.query.start || toDateKey(new Date());
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 30);
        const end = req.query.end || toDateKey(endDate);

        const settings = await loadSettings(config);
        const blackouts = await loadBlackouts(config);

        const query = new URLSearchParams();
        query.set('select', 'id,date,time,status,hold_expires_at');
        query.append('date', `gte.${start}`);
        query.append('date', `lte.${end}`);
        const nowIso = new Date().toISOString();
        query.set('or', `(status.eq.confirmed,and(status.eq.pending,hold_expires_at.gt.${nowIso}))`);

        const bookingsResponse = await supabaseRequest(
            config,
            `/rest/v1/appointment_bookings?${query.toString()}`,
            { method: 'GET' }
        );

        if (!bookingsResponse.ok) {
            const errorText = await bookingsResponse.text();
            throw new Error(errorText || 'Unable to load bookings.');
        }

        const bookingsData = await bookingsResponse.json();
        const bookings = Array.isArray(bookingsData)
            ? bookingsData.map((booking) => ({
                date: booking.date,
                time: booking.time,
                status: booking.status
            }))
            : [];

        return res.status(200).json({ settings, blackouts, bookings });
    } catch (error) {
        return res.status(500).json({ error: error.message || 'Unable to load availability.' });
    }
}
