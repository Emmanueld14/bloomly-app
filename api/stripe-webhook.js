import crypto from 'node:crypto';
import { setCors, getEnvConfig, ensureConfig } from './appointments-helpers.js';
import { prisma } from './db.js';
import { confirmPaidBooking } from './payment-utils.js';

function getRawBody(req) {
    if (typeof req.rawBody === 'string' || Buffer.isBuffer(req.rawBody)) {
        return Buffer.isBuffer(req.rawBody) ? req.rawBody.toString('utf8') : req.rawBody;
    }
    if (typeof req.body === 'string') return req.body;
    return JSON.stringify(req.body || {});
}

function verifyStripeSignature(rawBody, signatureHeader, secret) {
    if (!secret) return true;
    const parts = String(signatureHeader || '').split(',').reduce((acc, item) => {
        const [key, value] = item.split('=');
        acc[key] = value;
        return acc;
    }, {});
    if (!parts.t || !parts.v1) return false;
    const signedPayload = `${parts.t}.${rawBody}`;
    const expected = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
    try {
        return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1));
    } catch (error) {
        return false;
    }
}

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

    const rawBody = getRawBody(req);
    if (!verifyStripeSignature(rawBody, req.headers['stripe-signature'], config.stripeWebhookSecret)) {
        return res.status(400).json({ error: 'Invalid Stripe signature.' });
    }

    try {
        const event = typeof req.body === 'object' && req.body?.type ? req.body : JSON.parse(rawBody);
        if (event.type !== 'checkout.session.completed') {
            return res.status(200).json({ received: true });
        }

        const session = event.data?.object || {};
        const bookingId = session.client_reference_id || session.metadata?.booking_id;
        if (!bookingId || session.payment_status !== 'paid') {
            return res.status(200).json({ received: true, ignored: true });
        }

        const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found.' });
        }

        const existingPayment = await prisma.payment.findFirst({ where: { stripeRef: session.id } });
        const payment = existingPayment
            ? await prisma.payment.update({
                where: { id: existingPayment.id },
                data: {
                    status: 'processing',
                    stripeRef: session.id,
                    rawPayload: event,
                    updatedAt: new Date()
                }
            })
            : await prisma.payment.create({
                data: {
                    bookingId: booking.id,
                    method: 'stripe',
                    amount: Number(session.amount_total || booking.amountCents || 0),
                    currency: String(session.currency || booking.currency || 'KES').toUpperCase(),
                    status: 'processing',
                    stripeRef: session.id,
                    rawPayload: event
                }
            });

        await confirmPaidBooking({
            bookingId: booking.id,
            paymentId: payment.id,
            method: 'stripe',
            stripeRef: session.payment_intent || session.id,
            metadata: event
        });

        return res.status(200).json({ received: true });
    } catch (error) {
        return res.status(500).json({ error: error.message || 'Unable to process Stripe webhook.' });
    }
}
