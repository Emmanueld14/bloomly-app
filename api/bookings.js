function setCors(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function getSupabaseConfig() {
    return {
        url: process.env.SUPABASE_URL || '',
        key: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '',
    };
}

export default async function handler(req, res) {
    setCors(res);
    if (req.method === 'OPTIONS') {
        return res.status(200).json({ ok: true });
    }
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { url, key } = getSupabaseConfig();
    if (!url || !key) {
        return res.status(500).json({ error: 'Supabase is not configured.' });
    }

    const body = req.body || {};
    const row = {
        name: String(body.name || '').trim() || null,
        email: String(body.email || '').trim() || null,
        phone: String(body.phone || '').trim() || null,
        plan: String(body.plan || body.sessionType || '').trim() || null,
        amount: Math.round(Number(body.amount || 0)) || null,
        payment_method: String(body.payment_method || body.paymentMethod || '').trim() || null,
        payment_status: String(body.payment_status || 'confirmed').trim(),
    };

    if (!row.amount) {
        return res.status(400).json({ error: 'Amount is required.' });
    }

    try {
        const response = await fetch(`${url}/rest/v1/bookings`, {
            method: 'POST',
            headers: {
                apikey: key,
                Authorization: `Bearer ${key}`,
                'Content-Type': 'application/json',
                Prefer: 'return=representation',
            },
            body: JSON.stringify(row),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            return res.status(400).json({ error: data.message || data.error || 'Unable to save booking.' });
        }
        const booking = Array.isArray(data) ? data[0] : data;
        return res.status(200).json({ ok: true, booking });
    } catch (error) {
        return res.status(500).json({ error: error.message || 'Unable to save booking.' });
    }
}
