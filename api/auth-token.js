import { setCors, getEnvConfig, ensureConfig } from './appointments-helpers.js';
import { requestMpesaToken } from './payment-utils.js';

export default async function handler(req, res) {
    setCors(res);
    if (req.method === 'OPTIONS') {
        return res.status(200).json({ message: 'OK' });
    }
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const config = getEnvConfig();
    const configError = ensureConfig(config, ['mpesaConsumerKey', 'mpesaConsumerSecret']);
    if (configError) {
        return res.status(500).json({ error: configError });
    }

    try {
        const token = await requestMpesaToken(config);
        return res.status(200).json({ token });
    } catch (error) {
        return res.status(500).json({ error: error.message || 'Unable to get M-Pesa token.' });
    }
}
