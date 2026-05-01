import {
    setCors,
    getEnvConfig,
    ensureConfig
} from './appointments-helpers.js';
import { prisma } from './db.js';

function isValidDate(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
}

function parseBearerToken(req) {
    const authHeader = req.headers.authorization || req.headers.Authorization || '';
    if (!authHeader.startsWith('Bearer ')) return '';
    return authHeader.slice('Bearer '.length).trim();
}

async function verifyGitHubAccess(token, owner, repo) {
    const userResponse = await fetch('https://api.github.com/user', {
        headers: {
            Authorization: `token ${token}`,
            Accept: 'application/vnd.github.v3+json'
        }
    });

    if (!userResponse.ok) {
        return { ok: false, status: 401, error: 'Invalid GitHub session token.' };
    }

    const user = await userResponse.json();
    const repoResponse = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, {
        headers: {
            Authorization: `token ${token}`,
            Accept: 'application/vnd.github.v3+json'
        }
    });

    if (!repoResponse.ok) {
        return { ok: false, status: 403, error: 'GitHub account does not have repository access.' };
    }

    return {
        ok: true,
        user: {
            login: user.login || '',
            name: user.name || '',
            email: user.email || ''
        }
    };
}

function mapSummary(records) {
    const summary = {
        total: records.length,
        confirmed: 0,
        pending: 0,
        failed: 0,
        paid: 0
    };

    records.forEach((record) => {
        const sessionStatus = String(record.status || '').toLowerCase();
        const paymentStatus = String(record.payment?.status || '').toLowerCase();

        if (sessionStatus === 'confirmed') {
            summary.confirmed += 1;
        }
        if (sessionStatus === 'pending') {
            summary.pending += 1;
        }
        if (sessionStatus === 'failed' || sessionStatus === 'conflict') {
            summary.failed += 1;
        }
        if (paymentStatus === 'paid' || paymentStatus === 'captured' || paymentStatus === 'confirmed') {
            summary.paid += 1;
        }
    });

    return summary;
}

export default async function handler(req, res) {
    setCors(res);
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key, Authorization');
    if (req.method === 'OPTIONS') {
        return res.status(200).json({ message: 'OK' });
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const githubToken = parseBearerToken(req);
    if (!githubToken) {
        return res.status(401).json({ error: 'Missing Authorization bearer token.' });
    }

    const repoOwner = process.env.GITHUB_REPO_OWNER || 'Emmanueld14';
    const repoName = process.env.GITHUB_REPO_NAME || 'bloomly-app';
    const access = await verifyGitHubAccess(githubToken, repoOwner, repoName);
    if (!access.ok) {
        return res.status(access.status || 401).json({ error: access.error || 'Unauthorized.' });
    }

    const config = getEnvConfig();
    const configError = ensureConfig(config, ['databaseUrl']);
    if (configError) {
        return res.status(500).json({ error: configError });
    }

    const now = new Date();
    const startDefault = new Date(now);
    startDefault.setMonth(startDefault.getMonth() - 6);
    const start = isValidDate(req.query.start) ? req.query.start : startDefault.toISOString().slice(0, 10);
    const end = isValidDate(req.query.end) ? req.query.end : now.toISOString().slice(0, 10);

    try {
        const bookingList = await prisma.booking.findMany({
            where: {
                date: {
                    gte: start,
                    lte: end
                }
            },
            include: {
                payments: { orderBy: { createdAt: 'desc' } }
            },
            orderBy: [{ date: 'desc' }, { time: 'desc' }]
        });

        const records = bookingList.map((booking) => {
            const latestAttempt = booking.payments?.[0] || null;
            const payment = latestAttempt ? toPaymentResponse(latestAttempt) : null;
            return {
                id: booking.id,
                name: booking.name || '',
                email: booking.email || '',
                purpose: booking.purpose || '',
                date: booking.date || '',
                time: booking.time || '',
                status: booking.status || 'pending',
                amountCents: Number(booking.amountCents || 0),
                currency: booking.currency || 'KES',
                paidAt: booking.paidAt ? booking.paidAt.toISOString() : null,
                createdAt: booking.createdAt ? booking.createdAt.toISOString() : null,
                updatedAt: booking.updatedAt ? booking.updatedAt.toISOString() : null,
                payment: payment
                    ? {
                        id: payment.id,
                        provider: payment.method || '',
                        status: payment.status || '',
                        amountCents: Number(payment.amountCents || 0),
                        currency: payment.currency || booking.currency || 'KES',
                        externalReference: payment.external_reference || '',
                        createdAt: payment.createdAt || null,
                        updatedAt: payment.updatedAt || null
                    }
                    : null
            };
        });

        return res.status(200).json({
            actor: access.user,
            range: { start, end },
            summary: mapSummary(records),
            records
        });
    } catch (error) {
        return res.status(500).json({ error: error.message || 'Unable to load records.' });
    }
}
