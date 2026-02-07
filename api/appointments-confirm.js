import {
    setCors,
    getEnvConfig,
    ensureConfig,
    supabaseRequest
} from './appointments-helpers.js';

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

    const sessionId = String(req.body?.sessionId || '').trim();
    if (!sessionId) {
        return res.status(400).json({ error: 'Missing session id.' });
    }

    try {
        const stripeResponse = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${config.stripeSecretKey}`
            }
        });

        const stripeData = await stripeResponse.json().catch(() => ({}));
        if (!stripeResponse.ok) {
            throw new Error(stripeData.error?.message || 'Unable to verify payment session.');
        }

        if (stripeData.payment_status !== 'paid') {
            return res.status(400).json({ error: 'Payment not completed.' });
        }

        const bookingId = stripeData.client_reference_id || stripeData.metadata?.booking_id;
        if (!bookingId) {
            return res.status(400).json({ error: 'Booking reference missing.' });
        }

        const bookingResponse = await supabaseRequest(
            config,
            `/rest/v1/appointment_bookings?id=eq.${bookingId}&select=*`,
            { method: 'GET' }
        );

        if (!bookingResponse.ok) {
            const errorText = await bookingResponse.text();
            throw new Error(errorText || 'Unable to load booking.');
        }

        const bookingData = await bookingResponse.json();
        const booking = Array.isArray(bookingData) ? bookingData[0] : null;
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found.' });
        }

        if (booking.status === 'confirmed') {
            return res.status(200).json({ booking });
        }

        const conflictQuery = new URLSearchParams();
        conflictQuery.set('select', 'id');
        conflictQuery.set('date', `eq.${booking.date}`);
        conflictQuery.set('time', `eq.${booking.time}`);
        conflictQuery.set('status', 'eq.confirmed');
        conflictQuery.set('id', `neq.${booking.id}`);

        const conflictResponse = await supabaseRequest(
            config,
            `/rest/v1/appointment_bookings?${conflictQuery.toString()}`,
            { method: 'GET' }
        );

        if (!conflictResponse.ok) {
            const errorText = await conflictResponse.text();
            throw new Error(errorText || 'Unable to verify slot.');
        }

        const conflicts = await conflictResponse.json();
        if (Array.isArray(conflicts) && conflicts.length) {
            await supabaseRequest(
                config,
                `/rest/v1/appointment_bookings?id=eq.${booking.id}`,
                {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'conflict' })
                }
            );
            return res.status(409).json({ error: 'This slot was already booked. Please contact support.' });
        }

        const updatePayload = {
            status: 'confirmed',
            paid_at: new Date().toISOString(),
            stripe_payment_intent_id: stripeData.payment_intent || booking.stripe_payment_intent_id,
            hold_expires_at: null
        };

        const updateResponse = await supabaseRequest(
            config,
            `/rest/v1/appointment_bookings?id=eq.${booking.id}`,
            {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatePayload)
            }
        );

        if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            throw new Error(errorText || 'Unable to confirm booking.');
        }

        const refreshedResponse = await supabaseRequest(
            config,
            `/rest/v1/appointment_bookings?id=eq.${booking.id}&select=*`,
            { method: 'GET' }
        );
        const refreshedData = await refreshedResponse.json();
        const updatedBooking = Array.isArray(refreshedData) ? refreshedData[0] : booking;

        return res.status(200).json({ booking: updatedBooking });
    } catch (error) {
        return res.status(500).json({ error: error.message || 'Unable to confirm Charla.' });
    }
}
