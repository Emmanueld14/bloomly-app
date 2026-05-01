import { setCors, getEnvConfig, ensureConfig } from './appointments-helpers.js';
import { prisma, toBookingResponse, toPaymentResponse } from './db.js';

export default async function handler(req, res) {
    setCors(res);
    if (req.method === 'OPTIONS') {
        return res.status(200).json({ message: 'OK' });
    }
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const config = getEnvConfig();
    const configError = ensureConfig(config, ['databaseUrl']);
    if (configError) {
        return res.status(500).json({ error: configError });
    }

    const bookingId = String(req.query.booking_id || req.query.bookingId || '').trim();
    if (!bookingId) {
        return res.status(400).json({ error: 'Missing booking id.' });
    }

    try {
        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: {
                payments: { orderBy: { createdAt: 'desc' } }
            }
        });
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found.' });
        }

        if (booking.status === 'pending' && booking.holdExpiresAt && booking.holdExpiresAt < new Date()) {
            const expired = await prisma.booking.update({
                where: { id: booking.id },
                data: { status: 'expired', updatedAt: new Date() },
                include: {
                    payments: { orderBy: { createdAt: 'desc' } }
                }
            });
            return res.status(200).json({
                booking: toBookingResponse(expired),
                paymentAttempts: expired.payments.map(toPaymentResponse)
            });
        }

        return res.status(200).json({
            booking: toBookingResponse(booking),
            paymentAttempts: booking.payments.map(toPaymentResponse)
        });
    } catch (error) {
        return res.status(500).json({ error: error.message || 'Unable to load booking status.' });
    }
}
