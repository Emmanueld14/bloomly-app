import { prisma, toBookingResponse, toPaymentResponse } from './db.js';

export function getOrigin(req) {
    const configured = process.env.SITE_URL || process.env.URL || '';
    if (configured) return configured.replace(/\/$/, '');
    return `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
}

export function getPaymentConfig() {
    return {
        stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
        stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
        mpesaBaseUrl: process.env.MPESA_BASE_URL || 'https://sandbox.safaricom.co.ke',
        mpesaConsumerKey: process.env.MPESA_CONSUMER_KEY || '',
        mpesaConsumerSecret: process.env.MPESA_CONSUMER_SECRET || '',
        mpesaShortcode: process.env.MPESA_SHORTCODE || '',
        mpesaPasskey: process.env.MPESA_PASSKEY || '',
        mpesaCallbackUrl: process.env.MPESA_CALLBACK_URL || '',
        calendlyWebhookSigningKey: process.env.CALENDLY_WEBHOOK_SIGNING_KEY || ''
    };
}

export function centsToMajor(amountCents) {
    return Math.max(1, Math.round(Number(amountCents || 0) / 100));
}

export function normalizeKenyanPhone(value) {
    const digits = String(value || '').replace(/\D/g, '');
    if (/^2547\d{8}$/.test(digits)) return digits;
    if (/^07\d{8}$/.test(digits)) return `254${digits.slice(1)}`;
    if (/^7\d{8}$/.test(digits)) return `254${digits}`;
    return '';
}

export function getMpesaTimestamp(date = new Date()) {
    const pad = (value) => String(value).padStart(2, '0');
    return [
        date.getFullYear(),
        pad(date.getMonth() + 1),
        pad(date.getDate()),
        pad(date.getHours()),
        pad(date.getMinutes()),
        pad(date.getSeconds())
    ].join('');
}

export function getMpesaPassword(shortcode, passkey, timestamp) {
    return Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
}

export async function requestMpesaToken(config) {
    const credentials = Buffer.from(`${config.mpesaConsumerKey}:${config.mpesaConsumerSecret}`).toString('base64');
    const response = await fetch(`${config.mpesaBaseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
        headers: {
            Authorization: `Basic ${credentials}`
        }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.access_token) {
        throw new Error(data.errorMessage || data.error || 'Unable to authenticate with M-Pesa.');
    }
    return data.access_token;
}

export async function confirmPaidBooking({ bookingId, paymentId, method, stripeRef, mpesaRef, metadata = {} }) {
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
        throw new Error('Booking not found.');
    }

    if (booking.date && booking.time) {
        const conflicts = await prisma.booking.findMany({
            where: {
                id: { not: booking.id },
                date: booking.date,
                time: booking.time,
                status: 'confirmed'
            },
            select: { id: true }
        });
        if (conflicts.length) {
            await prisma.booking.update({
                where: { id: booking.id },
                data: { status: 'conflict', updatedAt: new Date() }
            });
            throw new Error('This slot was already booked. Please contact support.');
        }
    }

    if (booking.status === 'confirmed') {
        const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
        return {
            booking: toBookingResponse(booking),
            payment: toPaymentResponse(payment)
        };
    }

    const updatedPayment = await prisma.payment.update({
        where: { id: paymentId },
        data: {
            status: 'paid',
            method,
            ...(stripeRef ? { stripeRef } : {}),
            ...(mpesaRef ? { mpesaRef } : {}),
            rawPayload: {
                metadata,
                confirmedAt: new Date().toISOString()
            },
            updatedAt: new Date()
        }
    });

    const updatedBooking = await prisma.booking.update({
        where: { id: booking.id },
        data: {
            status: 'confirmed',
            paidAt: new Date(),
            holdExpiresAt: null,
            updatedAt: new Date()
        }
    });

    if (updatedBooking.calendlyEventId) {
        // Calendly does not expose a public "confirm invitee" API for standard events.
        // Bloomly treats the local Booking status as the payment-gated confirmation source.
        console.info(`Calendly booking ${updatedBooking.calendlyEventId} payment confirmed.`);
    }

    return {
        booking: toBookingResponse(updatedBooking),
        payment: toPaymentResponse(updatedPayment)
    };
}
