import {
    jsonResponse,
    optionsResponse,
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
} from '../appointments-helpers.js';

const HOLD_MINUTES = 15;

export async function onRequestOptions() {
    return optionsResponse();
}

export async function onRequestPost({ request, env }) {
    const config = getEnvConfig(env);
    const configError = ensureConfig(config, ['supabaseUrl', 'supabaseServiceKey', 'stripeSecretKey']);
    if (configError) {
        return jsonResponse({ error: configError }, 500);
    }

    const payload = await request.json().catch(() => ({}));
    const booking = normalizeBookingPayload(payload);
    const consents = normalizeConsentPayload(payload);
    const missingConsentKeys = missingConsents(consents);
    if (missingConsentKeys.length) {
        return jsonResponse({ error: 'Please confirm each required acknowledgement before booking.' }, 400);
    }

    if (!booking.name || !booking.email || !booking.purpose) {
        return jsonResponse({ error: 'Name, email, and purpose are required.' }, 400);
    }
    if (!isValidDate(booking.date) || !isValidTime(booking.time)) {
        return jsonResponse({ error: 'Invalid date or time.' }, 400);
    }
    const crisisReason = detectCrisisReason(booking.purpose);
    if (crisisReason) {
        return jsonResponse({
            error: 'This platform is not equipped to handle crisis situations or professional mental health support. Your concern is important and valid. Please seek help from a licensed counsellor, medical professional, or emergency services.',
            crisis: true,
            redirectUrl: '/appointments/crisis',
            reason: crisisReason
        }, 403);
    }

    try {
        const settings = await loadSettings(config);
        const blackouts = await loadBlackouts(config);

        if (!settings.bookingEnabled) {
            return jsonResponse({ error: 'Charla sessions are currently closed.' }, 400);
        }
        if (!settings.priceCents || settings.priceCents <= 0) {
            return jsonResponse({ error: 'Charla pricing is not configured.' }, 400);
        }

        const dayKey = getDayKey(booking.date);
        if (!settings.availableDays.includes(dayKey)) {
            return jsonResponse({ error: 'Selected date is not available.' }, 400);
        }

        if (blackouts.includes(booking.date)) {
            return jsonResponse({ error: 'Selected date is unavailable.' }, 400);
        }

        const allowedSlots = settings.timeSlots?.[dayKey] || [];
        if (!allowedSlots.includes(booking.time)) {
            return jsonResponse({ error: 'Selected time is not available.' }, 400);
        }

        const now = new Date();
        const dateParts = booking.date.split('-').map(Number);
        const timeParts = booking.time.split(':').map(Number);
        const bookingDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], timeParts[0], timeParts[1]);
        if (bookingDate < now) {
            return jsonResponse({ error: 'Selected time has already passed.' }, 400);
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
            return jsonResponse({ error: 'That slot has just been booked. Please choose another.' }, 409);
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

        const origin = new URL(request.url).origin;
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

        return jsonResponse({ checkoutUrl: stripeData.url, sessionId: stripeData.id });
    } catch (error) {
        return jsonResponse({ error: error.message || 'Unable to start booking.' }, 500);
    }
}
