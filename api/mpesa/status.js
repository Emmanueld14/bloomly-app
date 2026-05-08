function setCors(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function getMpesaConfig() {
    return {
        baseUrl: process.env.MPESA_BASE_URL || 'https://sandbox.safaricom.co.ke',
        consumerKey: process.env.MPESA_CONSUMER_KEY || '',
        consumerSecret: process.env.MPESA_CONSUMER_SECRET || '',
        shortcode: process.env.MPESA_SHORTCODE || '',
        passkey: process.env.MPESA_PASSKEY || ''
    };
}

function base64(value) {
    return Buffer.from(value).toString('base64');
}

function mpesaTimestamp(date = new Date()) {
    const pad = (value) => String(value).padStart(2, '0');
    return [
        date.getFullYear(),
        pad(date.getMonth() + 1),
        pad(date.getDate()),
        pad(date.getHours()),
        pad(date.getMinutes()),
        pad(date.getSeconds())
    ].join('');
}

async function getAccessToken(config) {
    const response = await fetch(`${config.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
        method: 'GET',
        headers: {
            Authorization: `Basic ${base64(`${config.consumerKey}:${config.consumerSecret}`)}`
        }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.access_token) {
        throw new Error(data.errorMessage || 'Unable to authenticate M-Pesa.');
    }
    return data.access_token;
}

export default async function handler(req, res) {
    setCors(res);
    if (req.method === 'OPTIONS') {
        return res.status(200).json({ message: 'OK' });
    }
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const checkoutRequestId = String(req.query.checkoutRequestId || '').trim();
    if (!checkoutRequestId) {
        return res.status(400).json({ error: 'checkoutRequestId is required.' });
    }

    const config = getMpesaConfig();
    const missing = ['consumerKey', 'consumerSecret', 'shortcode', 'passkey'].filter((key) => !config[key]);
    if (missing.length) {
        return res.status(500).json({ error: `Missing M-Pesa configuration: ${missing.join(', ')}` });
    }

    try {
        const token = await getAccessToken(config);
        const timestamp = mpesaTimestamp();
        const password = base64(`${config.shortcode}${config.passkey}${timestamp}`);
        const response = await fetch(`${config.baseUrl}/mpesa/stkpushquery/v1/query`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                BusinessShortCode: config.shortcode,
                Password: password,
                Timestamp: timestamp,
                CheckoutRequestID: checkoutRequestId
            })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            return res.status(400).json({ error: data.errorMessage || 'Unable to check M-Pesa status.' });
        }

        const resultCode = String(data.ResultCode ?? '');
        if (resultCode === '0') {
            return res.status(200).json({ paid: true, failed: false, message: data.ResultDesc || 'Payment confirmed.' });
        }
        if (resultCode) {
            return res.status(200).json({ paid: false, failed: true, message: data.ResultDesc || 'Payment was not completed.' });
        }

        return res.status(200).json({ paid: false, failed: false, message: 'Payment is still pending.' });
    } catch (error) {
        return res.status(500).json({ error: error.message || 'Unable to check M-Pesa status.' });
    }
}
