import {
    setCors,
    getEnvConfig,
    ensureConfig
} from './appointments-helpers.js';

const LIVE_CHECK_TIMEOUT_MS = 10000;

function encodeBasicAuth(value) {
    if (typeof btoa === 'function') {
        return btoa(value);
    }
    return Buffer.from(value).toString('base64');
}

async function fetchWithTimeout(url, options = {}, timeoutMs = LIVE_CHECK_TIMEOUT_MS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, {
            ...options,
            signal: controller.signal
        });
    } finally {
        clearTimeout(timer);
    }
}

async function parseResponseError(response) {
    const text = await response.text().catch(() => '');
    if (!text) return `HTTP ${response.status}`;
    try {
        const payload = JSON.parse(text);
        return payload.error_description || payload.errorMessage || payload.message || `HTTP ${response.status}`;
    } catch {
        return text.slice(0, 200);
    }
}

function buildProvider(configured, missing, liveCheck = null, details = {}) {
    const livePassed = !liveCheck || !liveCheck.attempted || liveCheck.ok;
    return {
        configured,
        ready: configured && livePassed,
        missing,
        liveCheck,
        ...details
    };
}

async function runMpesaCheck(config) {
    const auth = encodeBasicAuth(`${config.mpesaConsumerKey}:${config.mpesaConsumerSecret}`);
    const response = await fetchWithTimeout(
        `${config.mpesaBaseUrl}/oauth/v1/generate?grant_type=client_credentials`,
        {
            method: 'GET',
            headers: {
                Authorization: `Basic ${auth}`
            }
        }
    );

    if (!response.ok) {
        return { ok: false, detail: await parseResponseError(response), attempted: true };
    }

    const data = await response.json().catch(() => ({}));
    if (!data.access_token) {
        return { ok: false, detail: 'No access token returned.', attempted: true };
    }
    return { ok: true, detail: 'OAuth token request succeeded.', attempted: true };
}

function summarize(providers) {
    const providerKeys = Object.keys(providers);
    const readyCount = providerKeys.filter((key) => providers[key].ready).length;
    return {
        providerCount: providerKeys.length,
        readyCount,
        notReadyProviders: providerKeys.filter((key) => !providers[key].ready)
    };
}

export default async function handler(req, res) {
    setCors(res);
    if (req.method === 'OPTIONS') {
        return res.status(200).json({ message: 'OK' });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const config = getEnvConfig();
    const configError = ensureConfig(config, ['adminKey']);
    if (configError) {
        return res.status(500).json({ error: configError });
    }

    const adminKey = req.headers['x-admin-key'] || '';
    if (!adminKey || adminKey !== config.adminKey) {
        return res.status(401).json({ error: 'Unauthorized.' });
    }

    const runLiveChecks = req.body?.runLiveChecks !== false;

    const stripeMissing = [];
    if (!config.stripeSecretKey) stripeMissing.push('STRIPE_SECRET_KEY');
    const stripeConfigured = stripeMissing.length === 0;
    const stripeMode = config.stripeSecretKey.startsWith('sk_live') ? 'live' : 'test';

    const mpesaMissing = [];
    if (!config.mpesaConsumerKey) mpesaMissing.push('MPESA_CONSUMER_KEY');
    if (!config.mpesaConsumerSecret) mpesaMissing.push('MPESA_CONSUMER_SECRET');
    if (!config.mpesaShortcode) mpesaMissing.push('MPESA_SHORTCODE');
    if (!config.mpesaPasskey) mpesaMissing.push('MPESA_PASSKEY');
    if (!config.mpesaBaseUrl) mpesaMissing.push('MPESA_BASE_URL');
    const mpesaConfigured = mpesaMissing.length === 0;

    let mpesaLiveCheck = { attempted: false, ok: false, detail: 'Skipped.' };

    if (runLiveChecks && mpesaConfigured) {
        try {
            mpesaLiveCheck = await runMpesaCheck(config);
        } catch (error) {
            mpesaLiveCheck = { attempted: true, ok: false, detail: error.message || 'M-Pesa check failed.' };
        }
    }

    const providers = {
        stripe: buildProvider(
            stripeConfigured,
            stripeMissing,
            { attempted: false, ok: stripeConfigured, detail: stripeConfigured ? 'Configured.' : 'Missing secret key.' },
            { mode: stripeConfigured ? stripeMode : null }
        ),
        mpesa: buildProvider(mpesaConfigured, mpesaMissing, mpesaLiveCheck, { baseUrl: config.mpesaBaseUrl })
    };

    return res.status(200).json({
        generatedAt: new Date().toISOString(),
        runLiveChecks,
        providers,
        summary: summarize(providers)
    });
}
