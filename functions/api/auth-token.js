import handler from '../../api/auth-token.js';

function createResponseAdapter() {
    return {
        statusCode: 200,
        headers: {},
        body: null,
        setHeader(key, value) {
            this.headers[key] = value;
        },
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(payload) {
            this.body = payload;
            return new Response(JSON.stringify(payload), {
                status: this.statusCode,
                headers: {
                    'Content-Type': 'application/json',
                    ...this.headers
                }
            });
        }
    };
}

export async function onRequestGet({ request, env }) {
    const url = new URL(request.url);
    const req = {
        method: 'GET',
        query: Object.fromEntries(url.searchParams),
        headers: Object.fromEntries(request.headers.entries()),
        body: {},
        env
    };
    const res = createResponseAdapter();
    return handler(req, res);
}

export async function onRequestOptions() {
    const res = createResponseAdapter();
    return handler({ method: 'OPTIONS', query: {}, headers: {}, body: {} }, res);
}
