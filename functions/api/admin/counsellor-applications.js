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

    try {
        if (request.method === 'GET') {
            const { data } = await supabaseFetch(
                env,
                'counsellor_applications?select=*&order=applied_at.desc'
            );
            return jsonResponse({ applications: data || [] });
        }

        if (request.method === 'PATCH') {
            const body = await request.json().catch(() => ({}));
            const { id, status } = body;
            if (!id || !status) return jsonResponse({ error: 'Id and status required.' }, 400);
            const { response, data } = await supabaseFetch(env, `counsellor_applications?id=eq.${id}`, {
                method: 'PATCH',
                headers: { Prefer: 'return=representation' },
                body: JSON.stringify({ status }),
            });
            if (!response.ok) return jsonResponse({ error: 'Update failed' }, 400);
            return jsonResponse({ application: Array.isArray(data) ? data[0] : data });
        }

        return jsonResponse({ error: 'Method not allowed' }, 405);
    } catch (error) {
        return jsonResponse({ error: error.message || 'Applications API error.' }, 500);
    }
}
