import handler from '../../api/payments-status.js';

async function toJsonResponse(response) {
    const payload = await response.json().catch(() => ({}));
    return payload;
}

function createVercelLikeResponse() {
    return {
        statusCode: 200,
        headers: {},
        setHeader(name, value) {
            this.headers[name] = value;
        },
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(payload) {
            return new Response(JSON.stringify(payload), {
                status: this.statusCode,
                headers: { 'Content-Type': 'application/json', ...this.headers }
            });
        }
    };
}

async function runHandler(request) {
    const url = new URL(request.url);
    const req = {
        method: request.method,
        query: Object.fromEntries(url.searchParams.entries()),
        headers: Object.fromEntries(request.headers.entries()),
        body: request.method === 'GET' ? {} : await request.json().catch(() => ({}))
    };
    const res = createVercelLikeResponse();
    return handler(req, res);
}

export async function onRequestOptions() {
    return runHandler(new Request('https://local/api/payments-status', { method: 'OPTIONS' }));
}

export async function onRequestGet({ request }) {
    return runHandler(request);
}
