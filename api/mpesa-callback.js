import { setCors } from './appointments-helpers.js';
import { prisma } from './db.js';
import { confirmPaidBooking } from './payment-utils.js';

function getCallbackItems(callback) {
    const items = callback?.CallbackMetadata?.Item;
    if (!Array.isArray(items)) return {};
    return items.reduce((acc, item) => {
        if (item?.Name) acc[item.Name] = item.Value;
        return acc;
    }, {});
}

export default async function handler(req, res) {
    setCors(res);
    if (req.method === 'OPTIONS') {
        return res.status(200).json({ message: 'OK' });
    }
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const callback = req.body?.Body?.stkCallback || req.body?.stkCallback || {};
    const checkoutRequestId = String(callback.CheckoutRequestID || '').trim();
    const resultCode = Number(callback.ResultCode);
    if (!checkoutRequestId) {
        return res.status(400).json({ error: 'Missing CheckoutRequestID.' });
    }

    try {
        const payment = await prisma.payment.findFirst({
            where: { checkoutRequestId },
            orderBy: { createdAt: 'desc' }
        });
        if (!payment) {
            return res.status(404).json({ error: 'Payment not found.' });
        }

        if (resultCode !== 0) {
            await prisma.payment.update({
                where: { id: payment.id },
                data: {
                    status: 'failed',
                    rawPayload: req.body || callback,
                    updatedAt: new Date()
                }
            });
            return res.status(200).json({ ok: true });
        }

        const items = getCallbackItems(callback);
        const receipt = String(items.MpesaReceiptNumber || checkoutRequestId);
        await prisma.payment.update({
            where: { id: payment.id },
            data: {
                mpesaRef: receipt,
                checkoutRequestId,
                rawPayload: req.body || callback,
                updatedAt: new Date()
            }
        });

        await confirmPaidBooking({
            bookingId: payment.bookingId,
            paymentId: payment.id,
            method: 'mpesa',
            mpesaRef: receipt,
            metadata: req.body || callback
        });

        return res.status(200).json({ ok: true });
    } catch (error) {
        return res.status(500).json({ error: error.message || 'Unable to process M-Pesa callback.' });
    }
}
