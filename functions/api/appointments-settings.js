import {
    jsonResponse,
    optionsResponse,
    getEnvConfig,
    ensureConfig,
    supabaseRequest,
    loadSettings,
    loadBlackouts,
    loadDateOverrides,
    normalizeDateOverrides,
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
        const dateOverrides = await loadDateOverrides(config);
        return jsonResponse({ settings, blackouts, dateOverrides });
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
    const dateOverrides = normalizeDateOverrides(payload.dateOverrides || []);

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
            '/rest/v1/appointment_blackouts?id=not.is.null',
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

        const dateOverrideDeleteResponse = await supabaseRequest(
            config,
            '/rest/v1/appointment_date_overrides?date=not.is.null',
            { method: 'DELETE' }
        );
        if (!dateOverrideDeleteResponse.ok) {
            const errorText = await dateOverrideDeleteResponse.text();
            throw new Error(errorText || 'Unable to reset date overrides.');
        }

        if (dateOverrides.length) {
            const overridePayload = dateOverrides.map((entry) => ({
                date: entry.date,
                time_slots: entry.timeSlots
            }));
            const overrideResponse = await supabaseRequest(
                config,
                '/rest/v1/appointment_date_overrides',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Prefer: 'return=representation'
                    },
                    body: JSON.stringify(overridePayload)
                }
            );
            if (!overrideResponse.ok) {
                const errorText = await overrideResponse.text();
                throw new Error(errorText || 'Unable to update date overrides.');
            }
        }

        const settings = await loadSettings(config);
        const blackouts = await loadBlackouts(config);
        const savedDateOverrides = await loadDateOverrides(config);
        return jsonResponse({ settings, blackouts, dateOverrides: savedDateOverrides });
    } catch (error) {
        return jsonResponse({ error: error.message || 'Unable to update settings.' }, 500);
    }
}
