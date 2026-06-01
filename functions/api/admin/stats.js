import {
    jsonResponse,
    optionsResponse,
    requireAdmin,
    supabaseFetch,
    supabaseFetchList,
    countFromRange,
} from '../../lib/admin-api.js';

export async function onRequestOptions() {
    return optionsResponse();
}

export async function onRequestGet(context) {
    const { request, env } = context;
    const gate = await requireAdmin(request, env);
    if (gate.errorResponse) return gate.errorResponse;

    try {
        const [posts, subscribers, bookings, counsellors] = await Promise.all([
            supabaseFetch(env, 'posts?select=id', { headers: { Prefer: 'count=exact' } }),
            supabaseFetch(env, 'subscribers?select=id', { headers: { Prefer: 'count=exact' } }),
            supabaseFetch(env, 'bookings?select=id', { headers: { Prefer: 'count=exact' } }),
            supabaseFetch(env, 'counsellor_applications?status=eq.pending&select=id', {
                headers: { Prefer: 'count=exact' },
            }),
        ]);

        const [recentBookings, recentSubscribers] = await Promise.all([
            supabaseFetchList(env, 'bookings', ['booked_at', 'created_at']).then((rows) =>
                rows.slice(0, 5)
            ),
            supabaseFetchList(env, 'subscribers', ['subscribed_at', 'created_at']).then((rows) =>
                rows.slice(0, 5)
            ),
        ]);

        return jsonResponse({
            counts: {
                posts: countFromRange(posts.response),
                subscribers: countFromRange(subscribers.response),
                bookings: countFromRange(bookings.response),
                counsellorApplicationsPending: countFromRange(counsellors.response),
            },
            recentBookings,
            recentSubscribers,
        });
    } catch (error) {
        return jsonResponse({ error: error.message || 'Unable to load stats.' }, 500);
    }
}
