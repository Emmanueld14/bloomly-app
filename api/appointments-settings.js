import {
    setCors,
    getEnvConfig,
    ensureConfig,
    loadSettings,
    loadBlackouts,
    loadDateOverrides,
    normalizeDateOverrides,
    normalizeSettings
} from './appointments-helpers.js';
import { prisma } from './db.js';

export default async function handler(req, res) {
    setCors(res);
    if (req.method === 'OPTIONS') {
        return res.status(200).json({ message: 'OK' });
    }

    const config = getEnvConfig();
    if (req.method === 'GET') {
        const configError = ensureConfig(config, ['databaseUrl']);
        if (configError) {
            return res.status(500).json({ error: configError });
        }

        try {
            const settings = await loadSettings(config, prisma);
            const blackouts = await loadBlackouts(config, prisma);
            const dateOverrides = await loadDateOverrides(config, prisma);
            return res.status(200).json({ settings, blackouts, dateOverrides });
        } catch (error) {
            return res.status(500).json({ error: error.message || 'Unable to load settings.' });
        }
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const configError = ensureConfig(config, ['databaseUrl', 'adminKey']);
    if (configError) {
        return res.status(500).json({ error: configError });
    }

    const adminKey = req.headers['x-admin-key'] || '';
    if (!adminKey || adminKey !== config.adminKey) {
        return res.status(401).json({ error: 'Unauthorized.' });
    }

    const normalized = normalizeSettings(req.body || {});
    const blackoutDates = Array.isArray(req.body?.blackouts) ? req.body.blackouts : [];
    const dateOverrides = normalizeDateOverrides(req.body?.dateOverrides || []);

    try {
        await prisma.$transaction(async (tx) => {
            await tx.appointmentSetting.upsert({
                where: { id: 1 },
                update: {
                    bookingEnabled: normalized.bookingEnabled,
                    priceCents: normalized.priceCents,
                    currency: normalized.currency,
                    availableDays: normalized.availableDays,
                    timeSlots: normalized.timeSlots,
                    timezone: normalized.timezone
                },
                create: {
                    id: 1,
                    bookingEnabled: normalized.bookingEnabled,
                    priceCents: normalized.priceCents,
                    currency: normalized.currency,
                    availableDays: normalized.availableDays || [],
                    timeSlots: normalized.timeSlots || {},
                    timezone: normalized.timezone
                }
            });

            await tx.appointmentBlackout.deleteMany({});
            if (blackoutDates.length) {
                await tx.appointmentBlackout.createMany({
                    data: blackoutDates.map((date) => ({ date })),
                    skipDuplicates: true
                });
            }

            await tx.appointmentDateOverride.deleteMany({});
            if (dateOverrides.length) {
                await tx.appointmentDateOverride.createMany({
                    data: dateOverrides.map((entry) => ({
                        date: entry.date,
                        timeSlots: entry.timeSlots || []
                    })),
                    skipDuplicates: true
                });
            }
        });

        const settings = await loadSettings(config, prisma);
        const blackouts = await loadBlackouts(config, prisma);
        const savedDateOverrides = await loadDateOverrides(config, prisma);
        return res.status(200).json({ settings, blackouts, dateOverrides: savedDateOverrides });
    } catch (error) {
        return res.status(500).json({ error: error.message || 'Unable to update settings.' });
    }
}
