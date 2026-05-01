const DEFAULT_SETTINGS = {
    bookingEnabled: false,
    priceCents: 0,
    currency: 'KES',
    availableDays: [],
    timeSlots: {},
    timezone: 'UTC'
};

const FALLBACK_APPOINTMENTS_ADMIN_KEY = 'Manu@4477';

export function setCors(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key, Authorization');
}

export function getEnvConfig() {
    const adminKey = process.env.APPOINTMENTS_ADMIN_KEY || FALLBACK_APPOINTMENTS_ADMIN_KEY;
    return {
        databaseUrl: process.env.DATABASE_URL || '',
        adminKey,
        stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
        stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
        siteUrl: process.env.SITE_URL || '',
        calendlyEventUrl: process.env.CALENDLY_EVENT_URL || '',
        calendlyWebhookSigningKey: process.env.CALENDLY_WEBHOOK_SIGNING_KEY || '',
        mpesaBaseUrl: process.env.MPESA_BASE_URL || 'https://sandbox.safaricom.co.ke',
        mpesaConsumerKey: process.env.MPESA_CONSUMER_KEY || '',
        mpesaConsumerSecret: process.env.MPESA_CONSUMER_SECRET || '',
        mpesaShortcode: process.env.MPESA_SHORTCODE || '',
        mpesaPasskey: process.env.MPESA_PASSKEY || '',
        mpesaCallbackUrl: process.env.MPESA_CALLBACK_URL || ''
    };
}

export function ensureConfig(config, required = []) {
    const missing = required.filter((key) => !config[key]);
    return missing.length ? `Missing required configuration: ${missing.join(', ')}` : null;
}

export async function loadSettings(_config, prisma) {
    const row = await prisma.appointmentSetting.findFirst({ orderBy: { id: 'asc' } }).catch(() => null);
    return normalizeSettings(row);
}

export async function loadBlackouts(_config, prisma) {
    const rows = await prisma.appointmentBlackout.findMany({
        select: { date: true },
        orderBy: { date: 'asc' }
    }).catch(() => []);
    return rows.map((row) => row.date).filter(Boolean);
}

export async function loadDateOverrides(_config, prisma) {
    const rows = await prisma.appointmentDateOverride.findMany({ orderBy: { date: 'asc' } }).catch(() => []);
    return rows
        .map((row) => ({
            date: String(row.date || ''),
            timeSlots: normalizeSlots(row.timeSlots || [])
        }))
        .filter((row) => isValidDate(row.date));
}

export function normalizeSettings(row) {
    if (!row) return { ...DEFAULT_SETTINGS };
    const rawTimeSlots = row.timeSlots || row.time_slots || {};
    const normalizedTimeSlots = Object.entries(rawTimeSlots || {}).reduce((acc, [day, slots]) => {
        acc[day] = normalizeSlots(slots);
        return acc;
    }, {});
    return {
        bookingEnabled: Boolean(row.bookingEnabled ?? row.booking_enabled),
        priceCents: Number(row.priceCents ?? row.price_cents ?? 0),
        currency: row.currency || DEFAULT_SETTINGS.currency,
        availableDays: row.availableDays || row.available_days || [],
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
