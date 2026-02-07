import {
    setCors,
    getEnvConfig,
    ensureConfig,
    supabaseRequest,
    loadSettings,
    loadBlackouts,
    normalizeBookingPayload,
    normalizeConsentPayload,
    missingConsents,
    isValidDate,
    isValidTime,
    getDayKey,
    detectCrisisReason
} from './appointments-helpers.js';

const HOLD_MINUTES = 15;

export default async function handler(req, res) {
    setCors(res);
    if (req.method === 'OPTIONS') {
        return res.status(200).json({ message: 'OK' });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const config = getEnvConfig();
    const configError = ensureConfig(config, ['supabaseUrl', 'supabaseServiceKey', 'stripeSecretKey']);
    if (configError) {
        return res.status(500).json({ error: configError });
    }

    const booking = normalizeBookingPayload(req.body || {});
    const consents = normalizeConsentPayload(req.body || {});
    const missingConsentKeys = missingConsents(consents);
    if (missingConsentKeys.length) {
        return res.status(400).json({ error: 'Please confirm each required acknowledgement before booking.' });
    }
    if (!booking.name || !booking.email || !booking.purpose) {
        return res.status(400).json({ error: 'Name, email, and purpose are required.' });
    }
    if (!isValidDate(booking.date) || !isValidTime(booking.time)) {
        return res.status(400).json({ error: 'Invalid date or time.' });
    }
    const crisisReason = detectCrisisReason(booking.purpose);
    if (crisisReason) {
        return res.status(403).json({
            error: 'This platform is not equipped to handle crisis situations or professional mental health support. Your concern is important and valid. Please seek help from a licensed counsellor, medical professional, or emergency services.',
            crisis: true,
            redirectUrl: '/appointments/crisis',
            reason: crisisReason
        });
    }

    try {
        const settings = await loadSettings(config);
        const blackouts = await loadBlackouts(config);

        if (!settings.bookingEnabled) {
            return res.status(400).json({ error: 'Charla sessions are currently closed.' });
        }
        if (!settings.priceCents || settings.priceCents <= 0) {
            return res.status(400).json({ error: 'Charla pricing is not configured.' });
        }

        const dayKey = getDayKey(booking.date);
        if (!settings.availableDays.includes(dayKey)) {
            return res.status(400).json({ error: 'Selected date is not available.' });
        }
        if (blackouts.includes(booking.date)) {
            return res.status(400).json({ error: 'Selected date is unavailable.' });
        }

        const allowedSlots = settings.timeSlots?.[dayKey] || [];
        if (!allowedSlots.includes(booking.time)) {
            return res.status(400).json({ error: 'Selected time is not available.' });
        }

        const now = new Date();
        const dateParts = booking.date.split('-').map(Number);
        const timeParts = booking.time.split(':').map(Number);
        const bookingDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], timeParts[0], timeParts[1]);
        if (bookingDate < now) {
            return res.status(400).json({ error: 'Selected time has already passed.' });
        }

        const availabilityQuery = new URLSearchParams();
        availabilityQuery.set('select', 'id,status,hold_expires_at');
        availabilityQuery.set('date', `eq.${booking.date}`);
        availabilityQuery.set('time', `eq.${booking.time}`);
        const nowIso = new Date().toISOString();
        availabilityQuery.set('or', `(status.eq.confirmed,and(status.eq.pending,hold_expires_at.gt.${nowIso}))`);

        const availabilityResponse = await supabaseRequest(
            config,
            `/rest/v1/appointment_bookings?${availabilityQuery.toString()}`,
            { method: 'GET' }
        );

        if (!availabilityResponse.ok) {
            const errorText = await availabilityResponse.text();
            throw new Error(errorText || 'Unable to verify availability.');
        }

        const existing = await availabilityResponse.json();
        if (Array.isArray(existing) && existing.length) {
            return res.status(409).json({ error: 'That slot has just been booked. Please choose another.' });
        }

        const holdExpiresAt = new Date(Date.now() + HOLD_MINUTES * 60 * 1000).toISOString();
        const bookingPayload = {
            name: booking.name,
            email: booking.email,
            purpose: booking.purpose,
            date: booking.date,
            time: booking.time,
            status: 'pending',
            amount_cents: settings.priceCents,
            currency: settings.currency,
            hold_expires_at: holdExpiresAt,
            created_at: new Date().toISOString()
        };

        const insertResponse = await supabaseRequest(
            config,
            '/rest/v1/appointment_bookings',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Prefer: 'return=representation'
                },
                body: JSON.stringify([bookingPayload])
            }
        );

        if (!insertResponse.ok) {
            const errorText = await insertResponse.text();
            throw new Error(errorText || 'Unable to reserve booking.');
        }

        const inserted = await insertResponse.json();
        const bookingRow = Array.isArray(inserted) ? inserted[0] : null;
        if (!bookingRow || !bookingRow.id) {
            throw new Error('Unable to reserve booking.');
        }

        const origin = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
        const successUrl = `${origin}/appointments?success=1&session_id={CHECKOUT_SESSION_ID}`;
        const cancelUrl = `${origin}/appointments?canceled=1`;

        const stripePayload = new URLSearchParams();
        stripePayload.set('mode', 'payment');
        stripePayload.set('success_url', successUrl);
        stripePayload.set('cancel_url', cancelUrl);
        stripePayload.set('client_reference_id', bookingRow.id);
        stripePayload.set('payment_method_types[]', 'card');
        stripePayload.set('metadata[booking_id]', bookingRow.id);
        stripePayload.set('metadata[date]', booking.date);
        stripePayload.set('metadata[time]', booking.time);
        stripePayload.set('line_items[0][quantity]', '1');
        stripePayload.set('line_items[0][price_data][currency]', settings.currency);
        stripePayload.set('line_items[0][price_data][unit_amount]', String(settings.priceCents));
        stripePayload.set('line_items[0][price_data][product_data][name]', 'Bloomly Charla');

        const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${config.stripeSecretKey}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: stripePayload.toString()
        });

        const stripeData = await stripeResponse.json().catch(() => ({}));
        if (!stripeResponse.ok) {
            await supabaseRequest(
                config,
                `/rest/v1/appointment_bookings?id=eq.${bookingRow.id}`,
                {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'failed' })
                }
            );
            throw new Error(stripeData.error?.message || 'Unable to create payment session.');
        }

        await supabaseRequest(
            config,
            `/rest/v1/appointment_bookings?id=eq.${bookingRow.id}`,
            {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    stripe_session_id: stripeData.id,
                    stripe_payment_intent_id: stripeData.payment_intent || null
                })
            }
        );

        return res.status(200).json({ checkoutUrl: stripeData.url, sessionId: stripeData.id });
    } catch (error) {
        return res.status(500).json({ error: error.message || 'Unable to start booking.' });
    }
}
