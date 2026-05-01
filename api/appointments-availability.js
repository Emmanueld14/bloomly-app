import {
    setCors,
    getEnvConfig,
    loadSettings,
    loadBlackouts,
    loadDateOverrides
} from './appointments-helpers.js';
import { prisma } from './db.js';

function toDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export default async function handler(req, res) {
    setCors(res);
    if (req.method === 'OPTIONS') {
        return res.status(200).json({ message: 'OK' });
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const config = getEnvConfig();

    try {
        const start = req.query.start || toDateKey(new Date());
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 30);
        const end = req.query.end || toDateKey(endDate);

        const settings = await loadSettings(config, prisma);
        const blackouts = await loadBlackouts(config, prisma);
        const dateOverrides = await loadDateOverrides(config, prisma);

        const bookingsData = await prisma.booking.findMany({
            where: {
                date: { gte: start, lte: end },
                OR: [
                    { status: 'confirmed' },
                    {
                        status: 'pending',
                        holdExpiresAt: { gt: new Date() }
                    }
                ]
            },
            select: { date: true, time: true, status: true }
        });

        const bookings = bookingsData.map((booking) => ({
            date: booking.date,
            time: booking.time,
            status: booking.status
        }));

        return res.status(200).json({ settings, blackouts, dateOverrides, bookings });
    } catch (error) {
        return res.status(500).json({ error: error.message || 'Unable to load availability.' });
    }
}
