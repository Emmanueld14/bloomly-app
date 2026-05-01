import {
    setCors,
    getEnvConfig,
    ensureConfig
} from './appointments-helpers.js';
import { prisma, toBookingResponse } from './db.js';
import { confirmPaidBooking } from './payment-utils.js';

export default async function handler(req, res) {
    setCors(res);
    if (req.method === 'OPTIONS') {
        return res.status(200).json({ message: 'OK' });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const config = getEnvConfig();
    const configError = ensureConfig(config, ['databaseUrl', 'stripeSecretKey']);
    if (configError) {
        return res.status(500).json({ error: configError });
    }

    const sessionId = String(req.body?.sessionId || '').trim();
    if (!sessionId) {
        return res.status(400).json({ error: 'Missing session id.' });
    }

    try {
        const stripeResponse = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${config.stripeSecretKey}`
            }
        });

        const stripeData = await stripeResponse.json().catch(() => ({}));
        if (!stripeResponse.ok) {
            throw new Error(stripeData.error?.message || 'Unable to verify payment session.');
        }

        if (stripeData.payment_status !== 'paid') {
            return res.status(400).json({ error: 'Payment not completed.' });
        }

        const bookingId = stripeData.client_reference_id || stripeData.metadata?.booking_id;
        if (!bookingId) {
            return res.status(400).json({ error: 'Booking reference missing.' });
        }

        const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found.' });
        }

        if (booking.status === 'confirmed') {
            return res.status(200).json({ booking: toBookingResponse(booking) });
        }

        const existingPayment = await prisma.payment.findFirst({ where: { stripeRef: stripeData.id } });
        const payment = existingPayment
            ? await prisma.payment.update({
                where: { id: existingPayment.id },
                data: {
                    status: 'processing',
                    rawPayload: stripeData,
                    updatedAt: new Date()
                }
            })
            : await prisma.payment.create({
                data: {
                    bookingId: booking.id,
                    method: 'stripe',
                    amount: Number(stripeData.amount_total || booking.amountCents || 0),
                    currency: String(stripeData.currency || booking.currency || 'KES').toUpperCase(),
                    status: 'processing',
                    stripeRef: stripeData.id,
                    rawPayload: stripeData
                }
            });

        const { booking: updatedBooking } = await confirmPaidBooking({
            bookingId: booking.id,
            paymentId: payment.id,
            method: 'stripe',
            stripeRef: stripeData.payment_intent || stripeData.id,
            metadata: stripeData
        });

        return res.status(200).json({ booking: updatedBooking });
    } catch (error) {
        return res.status(500).json({ error: error.message || 'Unable to confirm Charla.' });
    }
}
