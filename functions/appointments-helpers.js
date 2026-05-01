export function jsonResponse(payload, status = 200) {
    return new Response(JSON.stringify(payload), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key, Authorization'
        }
    });
}

export function optionsResponse() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key, Authorization'
        }
    });
}

export {
    getEnvConfig,
    ensureConfig,
    normalizeSettings,
    normalizeSlots,
    normalizeDateOverrides,
    normalizeBookingPayload,
    isValidDate,
    isValidTime,
    getDayKey,
    setCors
} from '../api/appointments-helpers.js';
