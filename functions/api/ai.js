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

    const apiKey = env.HF_API_KEY || env.HUGGINGFACE_API_KEY;
    if (!apiKey) {
        return new Response(JSON.stringify({ error: 'Hugging Face API key not configured.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
    }

    const model = env.HF_MODEL || 'deepseek-ai/DeepSeek-R1-Distill-Qwen-32B';
    const apiUrl = env.HF_API_URL || `https://api-inference.huggingface.co/models/${model}`;
    const prompt = buildPrompt(body?.messages);
    const payload = {
        inputs: prompt,
        parameters: {
            max_new_tokens: 400,
            temperature: 0.7,
            top_p: 0.9
        },
        options: {
            wait_for_model: true
        }
    };

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

        const generated = Array.isArray(data) ? data[0]?.generated_text : data?.generated_text;
        const reply = String(generated || '').replace(prompt, '').trim();
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
