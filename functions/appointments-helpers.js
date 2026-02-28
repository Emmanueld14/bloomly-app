const DEFAULT_SETTINGS = {
    bookingEnabled: false,
    priceCents: 0,
    currency: 'KES',
    availableDays: [],
    timeSlots: {},
    timezone: 'UTC'
};

// Fallback values keep Charla operational even when host env vars are missing.
// Replace with environment variables in production for stronger security control.
const FALLBACK_SUPABASE_URL = 'https://xmhyjttyarskimsxcfhl.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY = 'sb_publishable_IOs-j6rgWuDnwrymIIUHxQ_wCTmcaMp';
const FALLBACK_APPOINTMENTS_ADMIN_KEY = 'BloomlyCharla2026!';

function buildCorsHeaders() {
    return {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key'
    };
}

export function jsonResponse(payload, status = 200) {
    return new Response(JSON.stringify(payload), {
        status,
        headers: buildCorsHeaders()
    });
}

export function optionsResponse() {
    return new Response(null, { headers: buildCorsHeaders() });
}

export function getEnvConfig(env) {
    const supabaseUrl = env.SUPABASE_URL || env.SUPABASE_PROJECT_URL || FALLBACK_SUPABASE_URL;
    const supabaseAnonKey = env.SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY;
    const supabaseServiceKey = env.SUPABASE_SERVICE_KEY || env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;
    const adminKey = env.APPOINTMENTS_ADMIN_KEY || FALLBACK_APPOINTMENTS_ADMIN_KEY;
    return {
        supabaseUrl,
        supabaseServiceKey,
        supabaseAnonKey,
        adminKey,
        stripeSecretKey: env.STRIPE_SECRET_KEY || '',
        siteUrl: env.SITE_URL || '',
        paypalBaseUrl: env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com',
        paypalClientId: env.PAYPAL_CLIENT_ID || '',
        paypalClientSecret: env.PAYPAL_CLIENT_SECRET || '',
        mpesaBaseUrl: env.MPESA_BASE_URL || 'https://sandbox.safaricom.co.ke',
        mpesaConsumerKey: env.MPESA_CONSUMER_KEY || '',
        mpesaConsumerSecret: env.MPESA_CONSUMER_SECRET || '',
        mpesaShortcode: env.MPESA_SHORTCODE || '',
        mpesaPasskey: env.MPESA_PASSKEY || '',
        mpesaCallbackUrl: env.MPESA_CALLBACK_URL || '',
        airtelBaseUrl: env.AIRTEL_BASE_URL || 'https://openapiuat.airtel.africa',
        airtelClientId: env.AIRTEL_CLIENT_ID || '',
        airtelClientSecret: env.AIRTEL_CLIENT_SECRET || '',
        airtelCountry: env.AIRTEL_COUNTRY || 'KE',
        airtelCurrency: env.AIRTEL_CURRENCY || 'KES',
        airtelCallbackUrl: env.AIRTEL_CALLBACK_URL || ''
    };
}

export function ensureConfig(config, requires = []) {
    const missing = requires.filter((key) => !config[key]);
    if (missing.length) {
        return `Missing required configuration: ${missing.join(', ')}`;
    }
    return null;
}

export async function supabaseRequest(config, path, options = {}, useServiceKey = true) {
    const key = useServiceKey ? config.supabaseServiceKey : config.supabaseAnonKey;
    const headers = {
        apikey: key,
        Authorization: `Bearer ${key}`,
        ...options.headers
    };
    const response = await fetch(`${config.supabaseUrl}${path}`, {
        ...options,
        headers
    });
    return response;
}

export async function loadSettings(config) {
    const response = await supabaseRequest(
        config,
        '/rest/v1/appointment_settings?select=*',
        { method: 'GET' }
    );

    if (!response.ok) {
        throw new Error('Unable to load Charla settings.');
    }
    const data = await response.json();
    const row = Array.isArray(data) ? data[0] : null;
    return normalizeSettings(row);
}

export async function loadBlackouts(config) {
    const response = await supabaseRequest(
        config,
        '/rest/v1/appointment_blackouts?select=date',
        { method: 'GET' }
    );
    if (!response.ok) {
        throw new Error('Unable to load blackout dates.');
    }
    const data = await response.json();
    return Array.isArray(data) ? data.map((row) => row.date).filter(Boolean) : [];
}

export async function loadDateOverrides(config) {
    const response = await supabaseRequest(
        config,
        '/rest/v1/appointment_date_overrides?select=date,time_slots&order=date.asc',
        { method: 'GET' }
    );
    if (!response.ok) {
        throw new Error('Unable to load date overrides.');
    }
    const data = await response.json();
    if (!Array.isArray(data)) return [];
    return data
        .map((row) => ({
            date: String(row.date || ''),
            timeSlots: normalizeSlots(row.time_slots || [])
        }))
        .filter((row) => isValidDate(row.date));
}

export function normalizeSettings(row) {
    if (!row) return { ...DEFAULT_SETTINGS };
    const rawTimeSlots = row.time_slots || row.timeSlots || {};
    const normalizedTimeSlots = Object.entries(rawTimeSlots || {}).reduce((acc, [day, slots]) => {
        acc[day] = normalizeSlots(slots);
        return acc;
    }, {});
    return {
        bookingEnabled: Boolean(row.booking_enabled ?? row.bookingEnabled),
        priceCents: Number(row.price_cents ?? row.priceCents ?? 0),
        currency: row.currency || DEFAULT_SETTINGS.currency,
        availableDays: row.available_days || row.availableDays || [],
        timeSlots: normalizedTimeSlots,
        timezone: row.timezone || DEFAULT_SETTINGS.timezone
    };
}

export function normalizeSlots(value) {
    const source = Array.isArray(value)
        ? value
        : String(value || '')
            .split(',')
            .map((entry) => String(entry || '').trim())
            .filter(Boolean);

    const normalized = source
        .map((slot) => {
            const raw = String(slot || '').trim();
            if (!raw) return '';

            const compact = raw.replace(/\s+/g, '');
            const noColonDigits = compact.replace(/[^\d]/g, '');
            if (!compact.includes(':') && /^\d{3,4}$/.test(noColonDigits)) {
                const padded = noColonDigits.padStart(4, '0');
                const hours = Number(padded.slice(0, 2));
                const minutes = Number(padded.slice(2));
                if (hours <= 23 && minutes <= 59) {
                    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
                }
            }

            const parts = compact.split(':');
            if (parts.length !== 2) return '';
            const hours = Number(parts[0]);
            const minutes = Number(parts[1]);
            if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return '';
            if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return '';
            return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        })
        .filter((slot) => isValidTime(slot));

    return [...new Set(normalized)].sort();
}

export function normalizeDateOverrides(overrides = []) {
    if (!Array.isArray(overrides)) return [];
    const byDate = new Map();

    overrides.forEach((entry) => {
        const date = String(entry?.date || '').trim();
        if (!isValidDate(date)) return;

        const timeSlots = normalizeSlots(
            entry?.timeSlots ?? entry?.time_slots ?? entry?.slots ?? []
        );
        if (!timeSlots.length) return;

        byDate.set(date, { date, timeSlots });
    });

    return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function normalizeBookingPayload(payload = {}) {
    const normalizedTime = normalizeSlots([payload.time || ''])[0] || String(payload.time || '').trim();
    return {
        name: String(payload.name || '').trim(),
        email: String(payload.email || '').trim().toLowerCase(),
        purpose: String(payload.purpose || '').trim(),
        date: String(payload.date || '').trim(),
        time: normalizedTime
    };
}

export function isValidDate(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function isValidTime(value) {
    return /^\d{2}:\d{2}$/.test(value);
}

export function getDayKey(dateValue) {
    const [year, month, day] = dateValue.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const dayIndex = date.getDay();
    return ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][dayIndex];
}
