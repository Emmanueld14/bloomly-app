import crypto from 'crypto';
import { setCors, getEnvConfig } from './appointments-helpers.js';
import { prisma } from './db.js';

function readRawBody(req) {
    if (typeof req.body === 'string') return req.body;
    if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');
    return JSON.stringify(req.body || {});
}

function verifyCalendlySignature(rawBody, signatureHeader, secret) {
    if (!secret || !signatureHeader) return Boolean(!secret);
    const parts = Object.fromEntries(
        String(signatureHeader)
            .split(',')
            .map((part) => part.split('=').map((value) => value.trim()))
            .filter((pair) => pair.length === 2)
    );
    const timestamp = parts.t;
    const signature = parts.v1;
    if (!timestamp || !signature) return false;
    const signedPayload = `${timestamp}.${rawBody}`;
    const expected = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
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
    if (!config.databaseUrl) {
        return res.status(500).json({ error: 'Missing required configuration: databaseUrl' });
    }
    const rawBody = readRawBody(req);
    const signature = req.headers['calendly-webhook-signature'] || '';
    if (!verifyCalendlySignature(rawBody, signature, config.calendlyWebhookSigningKey)) {
        return res.status(401).json({ error: 'Invalid Calendly signature.' });
    }

    const event = typeof req.body === 'object' ? req.body : JSON.parse(rawBody);
    if (event.event !== 'invitee.created') {
        return res.status(200).json({ received: true, ignored: true });
    }

    const payload = event.payload || {};
    const calendlyEventId = payload.event || payload.uri || payload.scheduled_event?.uri || '';
    const email = String(payload.email || '').toLowerCase();
    const name = String(payload.name || '').trim();

    const existingBooking = await prisma.booking.findFirst({ where: { calendlyEventId } });
    const booking = existingBooking
        ? await prisma.booking.update({
            where: { id: existingBooking.id },
            data: {
                name,
                email,
                status: 'pending_payment',
                updatedAt: new Date()
            }
        })
        : await prisma.booking.create({
            data: {
            calendlyEventId,
            name,
            email,
            purpose: 'Calendly consultation',
            status: 'pending_payment',
            amountCents: Number(process.env.CONSULTATION_PRICE_CENTS || 0),
            currency: process.env.CONSULTATION_CURRENCY || 'KES'
            }
        });

    return res.status(200).json({ received: true, bookingId: booking.id });
}
