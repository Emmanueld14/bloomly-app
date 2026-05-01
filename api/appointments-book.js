import {
    setCors,
    getEnvConfig,
    ensureConfig,
    loadSettings,
    loadBlackouts,
    loadDateOverrides,
    normalizeBookingPayload,
    isValidDate,
    isValidTime,
    getDayKey
} from './appointments-helpers.js';
import { prisma } from './db.js';
import { getOrigin } from './payment-utils.js';

const HOLD_MINUTES = 15;

export default async function handler(req, res) {
    setCors(res);
    if (req.method === 'OPTIONS') {
        return res.status(200).json({ message: 'OK' });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const config = getEnvConfig();
    const configError = ensureConfig(config, ['databaseUrl']);
    if (configError) {
        return res.status(500).json({ error: configError });
    }

    const booking = normalizeBookingPayload(req.body || {});
    if (!booking.name || !booking.email || !booking.purpose) {
        return res.status(400).json({ error: 'Name, email, and purpose are required.' });
    }
    if (!isValidDate(booking.date) || !isValidTime(booking.time)) {
        return res.status(400).json({ error: 'Invalid date or time.' });
    }

    try {
        const settings = await loadSettings(config, prisma);
        const blackouts = await loadBlackouts(config, prisma);
        const dateOverrides = await loadDateOverrides(config, prisma);

        if (!settings.bookingEnabled) {
            return res.status(400).json({ error: 'Charla sessions are currently closed.' });
        }
        if (!settings.priceCents || settings.priceCents <= 0) {
            return res.status(400).json({ error: 'Charla pricing is not configured.' });
        }

        const dayKey = getDayKey(booking.date);
        if (blackouts.includes(booking.date)) {
            return res.status(400).json({ error: 'Selected date is unavailable.' });
        }

        const allowedSlots = settings.timeSlots?.[dayKey] || [];
        const override = dateOverrides.find((entry) => entry.date === booking.date) || null;
        const effectiveSlots = override ? override.timeSlots : allowedSlots;

        if (!override && !settings.availableDays.includes(dayKey)) {
            return res.status(400).json({ error: 'Selected date is not available.' });
        }
        if (!effectiveSlots.includes(booking.time)) {
            return res.status(400).json({ error: 'Selected time is not available.' });
        }

        const now = new Date();
        const dateParts = booking.date.split('-').map(Number);
        const timeParts = booking.time.split(':').map(Number);
        const bookingDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], timeParts[0], timeParts[1]);
        if (bookingDate < now) {
            return res.status(400).json({ error: 'Selected time has already passed.' });
        }

        const nowIso = new Date().toISOString();
        const existing = await prisma.booking.findFirst({
            where: {
                date: booking.date,
                time: booking.time,
                OR: [
                    { status: 'confirmed' },
                    {
                        status: 'pending',
                        holdExpiresAt: { gt: new Date(nowIso) }
                    }
                ]
            },
            select: { id: true }
        });
        if (existing) {
            return res.status(409).json({ error: 'That slot has just been booked. Please choose another.' });
        }

        const holdExpiresAt = new Date(Date.now() + HOLD_MINUTES * 60 * 1000);
        const bookingRow = await prisma.booking.create({
            data: {
                name: booking.name,
                email: booking.email,
                purpose: booking.purpose,
                date: booking.date,
                time: booking.time,
                status: 'pending',
                amountCents: settings.priceCents,
                currency: settings.currency,
                holdExpiresAt
            }
        });

        const origin = getOrigin(req);
        return res.status(200).json({
            booking: {
                id: bookingRow.id,
                date: bookingRow.date,
                time: bookingRow.time,
                status: bookingRow.status,
                amount_cents: bookingRow.amountCents,
                currency: bookingRow.currency
            },
            paymentUrl: `${origin}/appointments/pay?booking_id=${encodeURIComponent(bookingRow.id)}`
        });
    } catch (error) {
        return res.status(500).json({ error: error.message || 'Unable to start booking.' });
    }
}
