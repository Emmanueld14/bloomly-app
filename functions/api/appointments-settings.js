import {
    jsonResponse,
    optionsResponse,
    getEnvConfig,
    ensureConfig,
    supabaseRequest,
    loadSettings,
    loadBlackouts,
    normalizeSettings
} from '../appointments-helpers.js';

export async function onRequestOptions() {
    return optionsResponse();
}

export async function onRequestGet({ env }) {
    const config = getEnvConfig(env);
    const configError = ensureConfig(config, ['supabaseUrl', 'supabaseServiceKey']);
    if (configError) {
        return jsonResponse({ error: configError }, 500);
    }

    try {
        const settings = await loadSettings(config);
        const blackouts = await loadBlackouts(config);
        return jsonResponse({ settings, blackouts });
    } catch (error) {
        return jsonResponse({ error: error.message || 'Unable to load settings.' }, 500);
    }
}

export async function onRequestPost({ request, env }) {
    const config = getEnvConfig(env);
    const configError = ensureConfig(config, ['supabaseUrl', 'supabaseServiceKey', 'adminKey']);
    if (configError) {
        return jsonResponse({ error: configError }, 500);
    }

    const adminKey = request.headers.get('X-Admin-Key') || '';
    if (!adminKey || adminKey !== config.adminKey) {
        return jsonResponse({ error: 'Unauthorized.' }, 401);
    }

    const payload = await request.json().catch(() => ({}));
    const normalized = normalizeSettings(payload);
    const blackoutDates = Array.isArray(payload.blackouts) ? payload.blackouts : [];

    try {
        const settingsPayload = {
            id: 1,
            booking_enabled: normalized.bookingEnabled,
            price_cents: normalized.priceCents,
            currency: normalized.currency,
            available_days: normalized.availableDays,
            time_slots: normalized.timeSlots,
            timezone: normalized.timezone,
            updated_at: new Date().toISOString()
        };

        const settingsResponse = await supabaseRequest(
            config,
            '/rest/v1/appointment_settings',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Prefer: 'resolution=merge-duplicates,return=representation'
                },
                body: JSON.stringify([settingsPayload])
            }
        );

        if (!settingsResponse.ok) {
            const errorText = await settingsResponse.text();
            throw new Error(errorText || 'Unable to update settings.');
        }

        await supabaseRequest(
            config,
            '/rest/v1/appointment_blackouts',
            { method: 'DELETE' }
        );

        if (blackoutDates.length) {
            const inserts = blackoutDates.map((date) => ({ date }));
            const blackoutResponse = await supabaseRequest(
                config,
                '/rest/v1/appointment_blackouts',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Prefer: 'return=representation'
                    },
                    body: JSON.stringify(inserts)
                }
            );
            if (!blackoutResponse.ok) {
                const errorText = await blackoutResponse.text();
                throw new Error(errorText || 'Unable to update blackout dates.');
            }
        }

        const settings = await loadSettings(config);
        const blackouts = await loadBlackouts(config);
        return jsonResponse({ settings, blackouts });
    } catch (error) {
        return jsonResponse({ error: error.message || 'Unable to update settings.' }, 500);
    }
}
