import {
    jsonResponse,
    optionsResponse,
    getEnvConfig,
    ensureConfig
} from '../appointments-helpers.js';

const LIVE_CHECK_TIMEOUT_MS = 10000;

function encodeBasicAuth(value) {
    if (typeof btoa === 'function') {
        return btoa(value);
    }
    if (typeof Buffer !== 'undefined') {
        return Buffer.from(value).toString('base64');
    }
    throw new Error('No base64 encoder available.');
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

async function runPaypalCheck(config) {
    const auth = encodeBasicAuth(`${config.paypalClientId}:${config.paypalClientSecret}`);
    const response = await fetchWithTimeout(
        `${config.paypalBaseUrl}/v1/oauth2/token`,
        {
            method: 'POST',
            headers: {
                Authorization: `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'grant_type=client_credentials'
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

async function runAirtelCheck(config) {
    const response = await fetchWithTimeout(
        `${config.airtelBaseUrl}/auth/oauth2/token`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: '*/*'
            },
            body: JSON.stringify({
                client_id: config.airtelClientId,
                client_secret: config.airtelClientSecret,
                grant_type: 'client_credentials'
            })
        }
    );

    if (!response.ok) {
        return { ok: false, detail: await parseResponseError(response), attempted: true };
    }

    const data = await response.json().catch(() => ({}));
    const token = data.access_token || data?.data?.access_token;
    if (!token) {
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

export async function onRequestOptions() {
    return optionsResponse();
}

export async function onRequestPost({ request, env }) {
    const config = getEnvConfig(env);
    const configError = ensureConfig(config, ['adminKey']);
    if (configError) {
        return jsonResponse({ error: configError }, 500);
    }

    const adminKey = request.headers.get('X-Admin-Key') || '';
    if (!adminKey || adminKey !== config.adminKey) {
        return jsonResponse({ error: 'Unauthorized.' }, 401);
    }

    const payload = await request.json().catch(() => ({}));
    const runLiveChecks = payload?.runLiveChecks !== false;

    const stripeMissing = [];
    if (!config.stripeSecretKey) stripeMissing.push('STRIPE_SECRET_KEY');
    const stripeConfigured = stripeMissing.length === 0;
    const stripeMode = config.stripeSecretKey.startsWith('sk_live') ? 'live' : 'test';

    const paypalMissing = [];
    if (!config.paypalClientId) paypalMissing.push('PAYPAL_CLIENT_ID');
    if (!config.paypalClientSecret) paypalMissing.push('PAYPAL_CLIENT_SECRET');
    if (!config.paypalBaseUrl) paypalMissing.push('PAYPAL_BASE_URL');
    const paypalConfigured = paypalMissing.length === 0;

    const mpesaMissing = [];
    if (!config.mpesaConsumerKey) mpesaMissing.push('MPESA_CONSUMER_KEY');
    if (!config.mpesaConsumerSecret) mpesaMissing.push('MPESA_CONSUMER_SECRET');
    if (!config.mpesaShortcode) mpesaMissing.push('MPESA_SHORTCODE');
    if (!config.mpesaPasskey) mpesaMissing.push('MPESA_PASSKEY');
    if (!config.mpesaBaseUrl) mpesaMissing.push('MPESA_BASE_URL');
    const mpesaConfigured = mpesaMissing.length === 0;

    const airtelMissing = [];
    if (!config.airtelClientId) airtelMissing.push('AIRTEL_CLIENT_ID');
    if (!config.airtelClientSecret) airtelMissing.push('AIRTEL_CLIENT_SECRET');
    if (!config.airtelBaseUrl) airtelMissing.push('AIRTEL_BASE_URL');
    const airtelConfigured = airtelMissing.length === 0;

    let paypalLiveCheck = { attempted: false, ok: false, detail: 'Skipped.' };
    let mpesaLiveCheck = { attempted: false, ok: false, detail: 'Skipped.' };
    let airtelLiveCheck = { attempted: false, ok: false, detail: 'Skipped.' };

    if (runLiveChecks && paypalConfigured) {
        try {
            paypalLiveCheck = await runPaypalCheck(config);
        } catch (error) {
            paypalLiveCheck = { attempted: true, ok: false, detail: error.message || 'PayPal check failed.' };
        }
    }
    if (runLiveChecks && mpesaConfigured) {
        try {
            mpesaLiveCheck = await runMpesaCheck(config);
        } catch (error) {
            mpesaLiveCheck = { attempted: true, ok: false, detail: error.message || 'M-Pesa check failed.' };
        }
    }
    if (runLiveChecks && airtelConfigured) {
        try {
            airtelLiveCheck = await runAirtelCheck(config);
        } catch (error) {
            airtelLiveCheck = { attempted: true, ok: false, detail: error.message || 'Airtel check failed.' };
        }
    }

    const providers = {
        stripe: buildProvider(
            stripeConfigured,
            stripeMissing,
            { attempted: false, ok: stripeConfigured, detail: stripeConfigured ? 'Configured.' : 'Missing secret key.' },
            { mode: stripeConfigured ? stripeMode : null }
        ),
        paypal: buildProvider(paypalConfigured, paypalMissing, paypalLiveCheck, { baseUrl: config.paypalBaseUrl }),
        mpesa: buildProvider(mpesaConfigured, mpesaMissing, mpesaLiveCheck, { baseUrl: config.mpesaBaseUrl }),
        airtel: buildProvider(airtelConfigured, airtelMissing, airtelLiveCheck, { baseUrl: config.airtelBaseUrl })
    };

    return jsonResponse({
        generatedAt: new Date().toISOString(),
        runLiveChecks,
        providers,
        summary: summarize(providers)
    });
}

export async function onRequestGet() {
    return jsonResponse({ error: 'Method not allowed' }, 405);
}
