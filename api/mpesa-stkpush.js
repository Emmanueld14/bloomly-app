import { setCors, getEnvConfig, ensureConfig } from './appointments-helpers.js';
import { prisma } from './db.js';
import {
    centsToMajor,
    getMpesaPassword,
    getMpesaTimestamp,
    getOrigin,
    normalizeKenyanPhone,
    requestMpesaToken
} from './payment-utils.js';

export default async function handler(req, res) {
    setCors(res);
    if (req.method === 'OPTIONS') {
        return res.status(200).json({ message: 'OK' });
    }
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const config = getEnvConfig();
    const configError = ensureConfig(config, [
        'databaseUrl',
        'mpesaConsumerKey',
        'mpesaConsumerSecret',
        'mpesaShortcode',
        'mpesaPasskey'
    ]);
    if (configError) {
        return res.status(500).json({ error: configError });
    }

    const bookingId = String(req.body?.bookingId || req.body?.booking_id || '').trim();
    const phone = normalizeKenyanPhone(req.body?.phone);
    if (!bookingId || !phone) {
        return res.status(400).json({ error: 'Booking ID and a valid Kenyan phone number are required.' });
    }

    try {
        const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found.' });
        }
        if (booking.status === 'confirmed') {
            return res.status(200).json({ pending: false, message: 'Booking is already confirmed.' });
        }

        const accessToken = await requestMpesaToken(config);
        const timestamp = getMpesaTimestamp();
        const amount = centsToMajor(booking.amountCents);
        const callbackUrl = config.mpesaCallbackUrl || `${getOrigin(req)}/api/mpesa-callback`;
        const payment = await prisma.payment.create({
            data: {
                bookingId: booking.id,
                method: 'mpesa',
                amount: booking.amountCents,
                currency: booking.currency || 'KES',
                status: 'pending',
                rawPayload: { phone, callbackUrl }
            }
        });

        const accountReference = `BLOOMLY-${payment.id.slice(0, 10)}`;
        const payload = {
            BusinessShortCode: config.mpesaShortcode,
            Password: getMpesaPassword(config.mpesaShortcode, config.mpesaPasskey, timestamp),
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline',
            Amount: amount,
            PartyA: phone,
            PartyB: config.mpesaShortcode,
            PhoneNumber: phone,
            CallBackURL: callbackUrl,
            AccountReference: accountReference,
            TransactionDesc: 'Bloomly Charla booking'
        };

        const response = await fetch(`${config.mpesaBaseUrl}/mpesa/stkpush/v1/processrequest`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.ResponseCode !== '0') {
            await prisma.payment.update({
                where: { id: payment.id },
                data: {
                    status: 'failed',
                    rawPayload: { request: payload, response: data },
                    updatedAt: new Date()
                }
            });
            throw new Error(data.errorMessage || data.ResponseDescription || 'Unable to start M-Pesa STK Push.');
        }

        await prisma.payment.update({
            where: { id: payment.id },
            data: {
                mpesaRef: data.CheckoutRequestID || data.MerchantRequestID || '',
                checkoutRequestId: data.CheckoutRequestID || '',
                rawPayload: { request: payload, response: data },
                updatedAt: new Date()
            }
        });

        return res.status(200).json({
            pending: true,
            bookingId: booking.id,
            paymentId: payment.id,
            checkoutRequestId: data.CheckoutRequestID,
            message: 'M-Pesa STK Push sent. Complete payment on your phone.'
        });
    } catch (error) {
        return res.status(500).json({ error: error.message || 'Unable to start M-Pesa payment.' });
    }
}
