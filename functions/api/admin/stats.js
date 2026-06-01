import {
    jsonResponse,
    optionsResponse,
    requireAdmin,
    supabaseFetch,
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

        const recentBookings = await supabaseFetch(env, 'bookings?select=*&order=booked_at.desc&limit=5');
        const recentSubscribers = await supabaseFetch(
            env,
            'subscribers?select=*&order=created_at.desc&limit=5'
        );

        return jsonResponse({
            counts: {
                posts: countFromRange(posts.response),
                subscribers: countFromRange(subscribers.response),
                bookings: countFromRange(bookings.response),
                counsellorApplicationsPending: countFromRange(counsellors.response),
            },
            recentBookings: recentBookings.data || [],
            recentSubscribers: recentSubscribers.data || [],
        });
    } catch (error) {
        return jsonResponse({ error: error.message || 'Unable to load stats.' }, 500);
    }
}
