import { setCors } from './appointments-helpers.js';
import { prisma } from './db.js';

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default async function handler(req, res) {
    setCors(res);
    if (req.method === 'OPTIONS') {
        return res.status(200).json({ message: 'OK' });
    }
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const email = String(req.body?.email || '').trim().toLowerCase();
    const name = String(req.body?.name || '').trim();
    if (!isValidEmail(email)) {
        return res.status(400).json({ error: 'A valid email address is required.' });
    }

    try {
        const existing = await prisma.subscriber.findFirst({ where: { email } });
        if (existing) {
            return res.status(200).json({ status: 'already_subscribed' });
        }

        await prisma.subscriber.create({
            data: {
                email,
                name: name || null
            }
        });

        return res.status(201).json({ status: 'subscribed' });
    } catch (error) {
        return res.status(500).json({ error: error.message || 'Unable to subscribe.' });
    }
}
