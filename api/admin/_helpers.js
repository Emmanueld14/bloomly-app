const ALLOWED_ADMIN_EMAILS = [
    'manuel.muh@lightacademynairobi.sc.ke',
    'manuelmuhunami@gmail.com',
    'muhunanim@gmail.com',
];

export function setCors(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey, x-client-info');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
}

export function getSupabaseConfig() {
    return {
        url: process.env.SUPABASE_URL || '',
        key: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '',
    };
}

export async function verifyAdmin(req) {
    const auth = String(req.headers.authorization || '');
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

export async function supabaseFetch(path, options = {}) {
    const { url, key } = getSupabaseConfig();
    if (!url || !key) throw new Error('Supabase is not configured.');
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
