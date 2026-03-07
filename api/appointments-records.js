import {
    setCors,
    getEnvConfig,
    ensureConfig,
    supabaseRequest
} from './appointments-helpers.js';

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
    const configError = ensureConfig(config, ['supabaseUrl', 'supabaseServiceKey']);
    if (configError) {
        return res.status(500).json({ error: configError });
    }

    const now = new Date();
    const startDefault = new Date(now);
    startDefault.setMonth(startDefault.getMonth() - 6);
    const start = isValidDate(req.query.start) ? req.query.start : startDefault.toISOString().slice(0, 10);
    const end = isValidDate(req.query.end) ? req.query.end : now.toISOString().slice(0, 10);

    try {
        const bookingQuery = new URLSearchParams();
        bookingQuery.set('select', 'id,name,email,purpose,date,time,status,amount_cents,currency,paid_at,created_at,updated_at');
        bookingQuery.append('date', `gte.${start}`);
        bookingQuery.append('date', `lte.${end}`);
        bookingQuery.set('order', 'date.desc,time.desc');

        const bookingsResponse = await supabaseRequest(
            config,
            `/rest/v1/appointment_bookings?${bookingQuery.toString()}`,
            { method: 'GET' }
        );

        if (!bookingsResponse.ok) {
            const errorText = await bookingsResponse.text();
            throw new Error(errorText || 'Unable to load appointment bookings.');
        }

        const bookings = await bookingsResponse.json();
        const bookingList = Array.isArray(bookings) ? bookings : [];
        const bookingIds = bookingList.map((row) => row.id).filter(Boolean);

        let paymentAttempts = [];
        if (bookingIds.length) {
            const paymentQuery = new URLSearchParams();
            paymentQuery.set('select', 'id,booking_id,provider,status,amount_cents,currency,external_reference,created_at,updated_at,metadata');
            paymentQuery.set('order', 'created_at.desc');
            paymentQuery.set('booking_id', `in.(${bookingIds.map((id) => `"${String(id).replace(/"/g, '""')}"`).join(',')})`);

            const paymentsResponse = await supabaseRequest(
                config,
                `/rest/v1/payment_attempts?${paymentQuery.toString()}`,
                { method: 'GET' }
            );

            if (!paymentsResponse.ok) {
                const errorText = await paymentsResponse.text();
                throw new Error(errorText || 'Unable to load payment attempts.');
            }

            const paymentRows = await paymentsResponse.json();
            paymentAttempts = Array.isArray(paymentRows) ? paymentRows : [];
        }

        const latestAttemptByBooking = new Map();
        paymentAttempts.forEach((attempt) => {
            const bookingId = attempt.booking_id;
            if (!bookingId || latestAttemptByBooking.has(bookingId)) return;
            latestAttemptByBooking.set(bookingId, attempt);
        });

        const records = bookingList.map((booking) => {
            const latestAttempt = latestAttemptByBooking.get(booking.id) || null;
            return {
                id: booking.id,
                name: booking.name || '',
                email: booking.email || '',
                purpose: booking.purpose || '',
                date: booking.date || '',
                time: booking.time || '',
                status: booking.status || 'pending',
                amountCents: Number(booking.amount_cents || 0),
                currency: booking.currency || 'KES',
                paidAt: booking.paid_at || null,
                createdAt: booking.created_at || null,
                updatedAt: booking.updated_at || null,
                payment: latestAttempt
                    ? {
                        id: latestAttempt.id,
                        provider: latestAttempt.provider || '',
                        status: latestAttempt.status || '',
                        amountCents: Number(latestAttempt.amount_cents || 0),
                        currency: latestAttempt.currency || booking.currency || 'KES',
                        externalReference: latestAttempt.external_reference || '',
                        createdAt: latestAttempt.created_at || null,
                        updatedAt: latestAttempt.updated_at || null
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
