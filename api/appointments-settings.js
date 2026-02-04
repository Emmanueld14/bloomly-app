import {
    setCors,
    getEnvConfig,
    ensureConfig,
    supabaseRequest,
    loadSettings,
    loadBlackouts,
    normalizeSettings
} from './appointments-helpers.js';

export default async function handler(req, res) {
    setCors(res);
    if (req.method === 'OPTIONS') {
        return res.status(200).json({ message: 'OK' });
    }

    const config = getEnvConfig();
    if (req.method === 'GET') {
        const configError = ensureConfig(config, ['supabaseUrl', 'supabaseServiceKey']);
        if (configError) {
            return res.status(500).json({ error: configError });
        }

        try {
            const settings = await loadSettings(config);
            const blackouts = await loadBlackouts(config);
            return res.status(200).json({ settings, blackouts });
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Unable to load settings.' });
        }
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const configError = ensureConfig(config, ['supabaseUrl', 'supabaseServiceKey', 'adminKey']);
    if (configError) {
        return res.status(500).json({ error: configError });
    }

    const adminKey = req.headers['x-admin-key'] || '';
    if (!adminKey || adminKey !== config.adminKey) {
        return res.status(401).json({ error: 'Unauthorized.' });
    }

    const normalized = normalizeSettings(req.body || {});
    const blackoutDates = Array.isArray(req.body?.blackouts) ? req.body.blackouts : [];

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

        await supabaseRequest(config, '/rest/v1/appointment_blackouts', { method: 'DELETE' });

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
        return res.status(200).json({ settings, blackouts });
    } catch (error) {
        return res.status(500).json({ error: error.message || 'Unable to update settings.' });
    }
}
