import handler from '../../api/calendly-webhook.js';

async function run(request) {
    const body = await request.json().catch(() => ({}));
    return new Promise((resolve) => {
        const req = { method: request.method, headers: Object.fromEntries(request.headers.entries()), body };
        const res = {
            statusCode: 200,
            headers: {},
            setHeader(key, value) { this.headers[key] = value; },
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

export async function onRequestOptions() {
    return run(new Request('https://bloomly.local', { method: 'OPTIONS' }));
}

export async function onRequestPost({ request }) {
    return run(request);
}
