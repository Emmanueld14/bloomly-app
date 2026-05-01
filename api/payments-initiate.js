import mpesaHandler from './mpesa-stkpush.js';
import stripeHandler from './stripe-checkout.js';
import { setCors } from './appointments-helpers.js';

export default async function handler(req, res) {
    setCors(res);
    if (req.method === 'OPTIONS') {
        return res.status(200).json({ message: 'OK' });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const provider = String(req.body?.provider || 'mpesa').toLowerCase();
    if (provider === 'stripe' || provider === 'card') {
        return stripeHandler(req, res);
    }
    if (provider === 'mpesa') {
        return mpesaHandler(req, res);
    }

    return res.status(400).json({ error: 'Unsupported payment provider.' });
}
