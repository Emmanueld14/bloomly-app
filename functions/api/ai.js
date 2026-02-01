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

function buildPrompt(messages) {
    const safeMessages = Array.isArray(messages) ? messages.slice(-12) : [];
    const history = safeMessages
        .map((message) => {
            const role = message.role === 'assistant' ? 'Assistant' : 'User';
            return `${role}: ${String(message.content || '').trim()}`;
        })
        .join('\n');

    return `${SYSTEM_PROMPT}\n\n${history}\nAssistant:`;
}

export async function onRequestOptions() {
    return new Response(null, { status: 204, headers: corsHeaders });
}

export async function onRequestGet(context) {
    const { env } = context;
    const apiKey = env.HF_API_KEY
        || env.HUGGINGFACE_API_KEY
        || env.AI_API_KEY
        || env.BLOOMLY_AI_KEY;
    const payload = { configured: Boolean(apiKey) };
    if (!apiKey) {
        payload.error = 'AI API key not configured.';
    }

    return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
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

    const apiKey = env.HF_API_KEY
        || env.HUGGINGFACE_API_KEY
        || env.AI_API_KEY
        || env.BLOOMLY_AI_KEY;
    if (!apiKey) {
        return new Response(JSON.stringify({ error: 'AI API key not configured.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
    }

    const apiUrlOverride = env.HF_API_URL || env.AI_API_URL;
    const requestedModel = env.HF_MODEL || env.AI_MODEL;
    const fallbackModels = [
        requestedModel,
        'mistralai/Mistral-7B-Instruct-v0.2',
        'HuggingFaceH4/zephyr-7b-beta'
    ].filter(Boolean);
    const modelsToTry = apiUrlOverride ? [null] : Array.from(new Set(fallbackModels));
    const prompt = buildPrompt(body?.messages);
    const payload = {
        inputs: prompt,
        parameters: {
            max_new_tokens: 220,
            temperature: 0.7,
            top_p: 0.9,
            return_full_text: false
        },
        options: {
            wait_for_model: true
        }
    };

    try {
        let lastError = null;
        for (const model of modelsToTry) {
            const apiUrl = apiUrlOverride || `https://api-inference.huggingface.co/models/${model}`;
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
                const message = data?.error?.message || data?.error || 'AI request failed.';
                const shouldRetry = response.status === 429
                    || response.status === 503
                    || /loading|overloaded|rate/i.test(message);
                lastError = { message, status: response.status };
                if (shouldRetry && modelsToTry.length > 1) {
                    continue;
                }
                return new Response(JSON.stringify({ error: message, status: response.status }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json', ...corsHeaders }
                });
            }

            const generated = Array.isArray(data) ? data[0]?.generated_text : data?.generated_text;
            const reply = String(generated || '').replace(prompt, '').trim();
            return new Response(JSON.stringify({ reply }), {
                status: 200,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }

        if (lastError) {
            return new Response(JSON.stringify({ error: lastError.message, status: lastError.status }), {
                status: 500,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Unable to reach AI service.' }), {
            status: 502,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
    }
}
