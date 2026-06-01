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
            const { data } = await supabaseFetch(env, 'subscribers?select=*&order=created_at.desc');
            return jsonResponse({ subscribers: data || [] });
        }

        if (request.method === 'DELETE') {
            const body = await request.json().catch(() => ({}));
            const id = url.searchParams.get('id') || body.id;
            if (!id) return jsonResponse({ error: 'Subscriber id required.' }, 400);
            const { response } = await supabaseFetch(env, `subscribers?id=eq.${id}`, { method: 'DELETE' });
            if (!response.ok) return jsonResponse({ error: 'Delete failed' }, 400);
            return jsonResponse({ ok: true });
        }

        return jsonResponse({ error: 'Method not allowed' }, 405);
    } catch (error) {
        return jsonResponse({ error: error.message || 'Subscribers API error.' }, 500);
    }
}
