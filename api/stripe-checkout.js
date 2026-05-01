import { setCors, getEnvConfig, ensureConfig } from './appointments-helpers.js';
import { prisma } from './db.js';
import { getOrigin } from './payment-utils.js';

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

    const bookingId = String(req.body?.bookingId || req.body?.booking_id || '').trim();
    if (!bookingId) {
        return res.status(400).json({ error: 'Missing booking id.' });
    }

    try {
        const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found.' });
        }
        if (booking.status === 'confirmed') {
            return res.status(200).json({ message: 'Booking already confirmed.' });
        }

        const origin = getOrigin(req);
        const stripePayload = new URLSearchParams();
        stripePayload.set('mode', 'payment');
        stripePayload.set('success_url', `${origin}/appointments/pay?booking_id=${encodeURIComponent(booking.id)}&stripe_success=1&session_id={CHECKOUT_SESSION_ID}`);
        stripePayload.set('cancel_url', `${origin}/appointments/pay?booking_id=${encodeURIComponent(booking.id)}&stripe_canceled=1`);
        stripePayload.set('client_reference_id', booking.id);
        stripePayload.set('payment_method_types[]', 'card');
        stripePayload.set('metadata[booking_id]', booking.id);
        stripePayload.set('line_items[0][quantity]', '1');
        stripePayload.set('line_items[0][price_data][currency]', String(booking.currency || 'KES').toLowerCase());
        stripePayload.set('line_items[0][price_data][unit_amount]', String(booking.amountCents));
        stripePayload.set('line_items[0][price_data][product_data][name]', 'Bloomly Charla');

        const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${config.stripeSecretKey}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: stripePayload.toString()
        });
        const stripeData = await stripeResponse.json().catch(() => ({}));
        if (!stripeResponse.ok) {
            throw new Error(stripeData.error?.message || 'Unable to create Stripe checkout session.');
        }

        const payment = await prisma.payment.create({
            data: {
                bookingId: booking.id,
                method: 'stripe',
                amount: booking.amountCents,
                currency: booking.currency,
                status: 'pending',
                stripeRef: stripeData.id,
                rawPayload: stripeData
            }
        });

        return res.status(200).json({ redirectUrl: stripeData.url, checkoutUrl: stripeData.url, sessionId: stripeData.id, paymentId: payment.id });
    } catch (error) {
        return res.status(500).json({ error: error.message || 'Unable to start Stripe checkout.' });
    }
}
