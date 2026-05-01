import handler from '../../api/payments-initiate.js';

export async function onRequestOptions() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key, Authorization'
        }
    });
}

export async function onRequestPost({ request, env }) {
    Object.entries(env || {}).forEach(([key, value]) => {
        if (process.env[key] === undefined) process.env[key] = value;
    });
    const body = await request.json().catch(() => ({}));
    const req = { method: 'POST', body, headers: Object.fromEntries(request.headers.entries()) };
    return new Promise((resolve) => {
        const res = {
            statusCode: 200,
            headers: {},
            setHeader(name, value) { this.headers[name] = value; },
            status(code) { this.statusCode = code; return this; },
            json(payload) {
                resolve(new Response(JSON.stringify(payload), {
                    status: this.statusCode,
                    headers: { 'Content-Type': 'application/json', ...this.headers }
                }));
            }
        };
        handler(req, res);
    });
}
