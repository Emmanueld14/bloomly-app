function setCors(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function getMpesaConfig() {
    return {
        baseUrl: process.env.MPESA_BASE_URL || 'https://sandbox.safaricom.co.ke',
        consumerKey: process.env.MPESA_CONSUMER_KEY || '',
        consumerSecret: process.env.MPESA_CONSUMER_SECRET || '',
        shortcode: process.env.MPESA_SHORTCODE || '',
        passkey: process.env.MPESA_PASSKEY || '',
        callbackUrl: process.env.MPESA_CALLBACK_URL || ''
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

function normalizePhone(phone) {
    const digits = String(phone || '').replace(/[^\d+]/g, '');
    if (digits.startsWith('+')) return digits.slice(1);
    if (digits.startsWith('0')) return `254${digits.slice(1)}`;
    return digits;
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
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const config = getMpesaConfig();
    const missing = ['consumerKey', 'consumerSecret', 'shortcode', 'passkey', 'callbackUrl']
        .filter((key) => !config[key]);
    if (missing.length) {
        return res.status(500).json({ error: `Missing M-Pesa configuration: ${missing.join(', ')}` });
    }

    const phone = normalizePhone(req.body?.phone);
    const amount = Math.round(Number(req.body?.amount || 0));
    const description = String(req.body?.description || 'Bloomly Charla').slice(0, 40);

    if (!/^2547\d{8}$/.test(phone)) {
        return res.status(400).json({ error: 'Enter a valid M-Pesa number in the format 2547XXXXXXXX.' });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({ error: 'Enter a valid amount.' });
    }

    try {
        const token = await getAccessToken(config);
        const timestamp = mpesaTimestamp();
        const password = base64(`${config.shortcode}${config.passkey}${timestamp}`);

        const response = await fetch(`${config.baseUrl}/mpesa/stkpush/v1/processrequest`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                BusinessShortCode: config.shortcode,
                Password: password,
                Timestamp: timestamp,
                TransactionType: 'CustomerPayBillOnline',
                Amount: amount,
                PartyA: phone,
                PartyB: config.shortcode,
                PhoneNumber: phone,
                CallBackURL: config.callbackUrl,
                AccountReference: String(req.body?.accountReference || 'Bloomly-Charla').slice(0, 12),
                TransactionDesc: description
            })
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok || String(data.ResponseCode) !== '0') {
            return res.status(400).json({
                error: data.errorMessage || data.ResponseDescription || 'Unable to start M-Pesa payment.'
            });
        }

        return res.status(200).json({
            MerchantRequestID: data.MerchantRequestID,
            CheckoutRequestID: data.CheckoutRequestID,
            ResponseCode: data.ResponseCode,
            ResponseDescription: data.ResponseDescription,
            CustomerMessage: data.CustomerMessage
        });
    } catch (error) {
        return res.status(500).json({ error: error.message || 'Unable to start M-Pesa payment.' });
    }
}
