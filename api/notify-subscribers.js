import { setCors, getEnvConfig, ensureConfig } from './appointments-helpers.js';
import { prisma } from './db.js';

export default async function handler(req, res) {
    setCors(res);
    if (req.method === 'OPTIONS') {
        return res.status(200).json({ message: 'OK' });
    }
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const config = getEnvConfig();
    const configError = ensureConfig(config, ['databaseUrl', 'adminKey']);
    if (configError) {
        return res.status(500).json({ error: configError });
    }
    if ((req.headers['x-admin-key'] || '') !== config.adminKey) {
        return res.status(401).json({ error: 'Unauthorized.' });
    }

    try {
        const subscribers = await prisma.subscriber.findMany({
            select: { email: true }
        });
        // Email delivery provider integration can be added here. Persisted subscribers are ready.
        return res.status(200).json({
            sent: 0,
            failed: 0,
            skipped: subscribers.length,
            message: 'Subscriber list loaded. Configure an email provider to send campaigns.'
        });
    } catch (error) {
        return res.status(500).json({ error: error.message || 'Unable to notify subscribers.' });
    }
}
