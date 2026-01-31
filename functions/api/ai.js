const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
};

const SYSTEM_PROMPT = `
You are Bloomly AI, a supportive mentor for teens.
Tone: calm, friendly, respectful, never judgmental.
Style: short empathetic opener, 2–4 practical bullet points, positive closing sentence.
No medical diagnosis, no prescriptions, no harmful or illegal advice.
If a request is unsafe or out of scope, redirect constructively and encourage trusted adults/professionals for serious issues.
Respect privacy and avoid requesting personal data.
Use relatable teen examples when helpful.
`.trim();

function buildPayload(messages, model) {
    const safeMessages = Array.isArray(messages) ? messages.slice(-12) : [];
    return {
        model,
        temperature: 0.7,
        max_tokens: 400,
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...safeMessages
        ]
    };
}

export async function onRequestOptions() {
    return new Response(null, { status: 204, headers: corsHeaders });
}

export async function onRequestPost(context) {
    const { request, env } = context;
    let body = null;

    try {
        body = await request.json();
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Invalid JSON payload.' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
    }

    const apiKey = env.AI_API_KEY || env.OPENAI_API_KEY;
    if (!apiKey) {
        return new Response(JSON.stringify({ error: 'AI API key not configured.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
    }

    const apiUrl = env.AI_API_URL || 'https://api.openai.com/v1/chat/completions';
    const model = env.AI_MODEL || 'gpt-4o-mini';
    const payload = buildPayload(body?.messages, model);

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            const message = data?.error?.message || 'AI request failed.';
            return new Response(JSON.stringify({ error: message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }

        const reply = data?.choices?.[0]?.message?.content?.trim() || '';
        return new Response(JSON.stringify({ reply }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Unable to reach AI service.' }), {
            status: 502,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
    }
}
