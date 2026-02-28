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
    return {
        supabaseUrl,
        supabaseServiceKey,
        supabaseAnonKey,
        adminKey: env.APPOINTMENTS_ADMIN_KEY || FALLBACK_APPOINTMENTS_ADMIN_KEY,
        stripeSecretKey: env.STRIPE_SECRET_KEY || ''
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

export function normalizeSettings(row) {
    if (!row) return { ...DEFAULT_SETTINGS };
    return {
        bookingEnabled: Boolean(row.booking_enabled ?? row.bookingEnabled),
        priceCents: Number(row.price_cents ?? row.priceCents ?? 0),
        currency: row.currency || DEFAULT_SETTINGS.currency,
        availableDays: row.available_days || row.availableDays || [],
        timeSlots: row.time_slots || row.timeSlots || {},
        timezone: row.timezone || DEFAULT_SETTINGS.timezone
    };
}

export function normalizeBookingPayload(payload = {}) {
    return {
        name: String(payload.name || '').trim(),
        email: String(payload.email || '').trim().toLowerCase(),
        purpose: String(payload.purpose || '').trim(),
        date: String(payload.date || '').trim(),
        time: String(payload.time || '').trim()
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
