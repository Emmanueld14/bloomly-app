function setCors(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
    setCors(res);
    if (req.method === 'OPTIONS') {
        return res.status(200).json({ message: 'OK' });
    }
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
    const sessionId = String(req.body?.sessionId || '').trim();
    if (!stripeSecretKey) {
        return res.status(500).json({ error: 'Stripe is not configured.' });
    }
    if (!sessionId) {
        return res.status(400).json({ error: 'sessionId is required.' });
    }

    try {
        const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${stripeSecretKey}`
            }
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            return res.status(400).json({ error: data.error?.message || 'Unable to verify Stripe payment.' });
        }
        return res.status(200).json({
            paid: data.payment_status === 'paid',
            status: data.status,
            paymentStatus: data.payment_status
        });
    } catch (error) {
        return res.status(500).json({ error: error.message || 'Unable to verify Stripe payment.' });
    }
}
