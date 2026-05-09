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
    if (!stripeSecretKey) {
        return res.status(500).json({ error: 'Stripe is not configured.' });
    }

    const amount = Math.round(Number(req.body?.amount || 0));
    const currency = String(req.body?.currency || 'KES').trim().toLowerCase();
    const sessionType = String(req.body?.sessionType || 'standard').trim();
    const description = String(req.body?.description || 'Bloomly Charla').trim();
    const origin = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
    const successUrl = String(req.body?.successUrl || `${origin}/appointments?stripe_session_id={CHECKOUT_SESSION_ID}`);
    const cancelUrl = String(req.body?.cancelUrl || `${origin}/appointments?payment_cancelled=1`);

    if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({ error: 'Enter a valid amount.' });
    }

    const payload = new URLSearchParams();
    payload.set('mode', 'payment');
    payload.set('success_url', successUrl);
    payload.set('cancel_url', cancelUrl);
    payload.set('payment_method_types[]', 'card');
    payload.set('metadata[session_type]', sessionType);
    payload.set('line_items[0][quantity]', '1');
    payload.set('line_items[0][price_data][currency]', currency);
    payload.set('line_items[0][price_data][unit_amount]', String(amount * 100));
    payload.set('line_items[0][price_data][product_data][name]', description);

    try {
        const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${stripeSecretKey}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: payload.toString()
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            return res.status(400).json({ error: data.error?.message || 'Unable to create Stripe Checkout session.' });
        }
        return res.status(200).json({ checkoutUrl: data.url, sessionId: data.id });
    } catch (error) {
        return res.status(500).json({ error: error.message || 'Unable to create Stripe Checkout session.' });
    }
}
