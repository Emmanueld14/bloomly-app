import handler from '../../api/stripe-webhook.js';

function createResponseAdapter() {
    return {
        statusCode: 200,
        headers: {},
        body: null,
        setHeader(name, value) {
            this.headers[name] = value;
        },
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(payload) {
            this.body = JSON.stringify(payload);
            this.headers['Content-Type'] = 'application/json';
            return new Response(this.body, {
                status: this.statusCode,
                headers: this.headers
            });
        }
    };
}

export async function onRequestOptions() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key, Authorization'
        }
    });
}

export async function onRequestPost({ request }) {
    const rawBody = await request.text();
    const body = rawBody ? JSON.parse(rawBody) : {};
    return handler(
        {
            method: 'POST',
            headers: Object.fromEntries(request.headers.entries()),
            body,
            rawBody
        },
        createResponseAdapter()
    );
}
