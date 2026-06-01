import {
    jsonResponse,
    optionsResponse,
    requireAdmin,
    supabaseFetch,
} from '../../lib/admin-api.js';

export async function onRequestOptions() {
    return optionsResponse();
}

export async function onRequest(context) {
    const { request, env } = context;
    const gate = await requireAdmin(request, env);
    if (gate.errorResponse) return gate.errorResponse;

    const url = new URL(request.url);

    try {
        if (request.method === 'GET') {
            const status = url.searchParams.get('status');
            let path = 'bookings?select=*&order=booked_at.desc';
            if (status && status !== 'all') {
                path += `&payment_status=eq.${encodeURIComponent(status)}`;
            }
            const { data } = await supabaseFetch(env, path);
            return jsonResponse({ bookings: data || [] });
        }

        if (request.method === 'PATCH') {
            const body = await request.json().catch(() => ({}));
            const { id, payment_status } = body;
            if (!id) return jsonResponse({ error: 'Booking id required.' }, 400);
            const { response, data } = await supabaseFetch(env, `bookings?id=eq.${id}`, {
                method: 'PATCH',
                headers: { Prefer: 'return=representation' },
                body: JSON.stringify({ payment_status: payment_status || 'confirmed' }),
            });
            if (!response.ok) return jsonResponse({ error: 'Update failed' }, 400);
            return jsonResponse({ booking: Array.isArray(data) ? data[0] : data });
        }

        return jsonResponse({ error: 'Method not allowed' }, 405);
    } catch (error) {
        return jsonResponse({ error: error.message || 'Bookings API error.' }, 500);
    }
}
