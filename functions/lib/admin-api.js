const ALLOWED_ADMIN_EMAILS = [
    'manuel.muh@lightacademynairobi.sc.ke',
    'manuelmuhunami@gmail.com',
    'muhunanim@gmail.com',
];

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export function jsonResponse(body, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            'Content-Type': 'application/json',
            ...CORS_HEADERS,
        },
    });
}

export function optionsResponse() {
    return new Response(null, { headers: CORS_HEADERS });
}

export function getSupabaseConfig(env) {
    return {
        url: env.SUPABASE_URL || '',
        key: env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY || '',
    };
}

export async function verifyAdmin(request) {
    const auth = request.headers.get('Authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) {
        return { ok: false, status: 401, error: 'Missing authorization token.' };
    }

    const userRes = await fetch('https://api.github.com/user', {
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'User-Agent': 'Bloomly-Admin',
        },
    });
    if (!userRes.ok) {
        return { ok: false, status: 401, error: 'Invalid GitHub token.' };
    }
    const user = await userRes.json();

    const emailRes = await fetch('https://api.github.com/user/emails', {
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'User-Agent': 'Bloomly-Admin',
        },
    });
    const emails = emailRes.ok ? await emailRes.json() : [];
    const primaryEmail = emails.find((e) => e.primary)?.email || emails[0]?.email || user.email || '';

    const allowed = ALLOWED_ADMIN_EMAILS.some(
        (e) => e.toLowerCase() === String(primaryEmail).toLowerCase()
    );
    if (!allowed) {
        return { ok: false, status: 403, error: 'Access denied. This account is not authorized.' };
    }

    return { ok: true, user, email: primaryEmail };
}

export async function supabaseFetch(env, path, options = {}) {
    const { url, key } = getSupabaseConfig(env);
    if (!url || !key) {
        throw new Error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Cloudflare Pages.');
    }

    const response = await fetch(`${url}/rest/v1/${path}`, {
        ...options,
        headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
            ...(options.headers || {}),
        },
    });
    const data = await response.json().catch(() => null);
    return { response, data };
}

export function slugify(title) {
    return String(title || '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

export async function requireAdmin(request, env) {
    const auth = await verifyAdmin(request);
    if (!auth.ok) {
        return { errorResponse: jsonResponse({ error: auth.error }, auth.status) };
    }
    return { auth };
}

export function countFromRange(response) {
    return Number(response.headers.get('content-range')?.split('/')[1] || 0);
}
