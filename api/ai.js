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

export default async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.status(204).end();
        return;
    }

    const apiKey = process.env.HF_API_KEY
        || process.env.HUGGINGFACE_API_KEY
        || process.env.AI_API_KEY
        || process.env.BLOOMLY_AI_KEY;

    if (req.method === 'GET') {
        const payload = { configured: Boolean(apiKey) };
        if (!apiKey) {
            payload.error = 'AI API key not configured.';
        }
        res.status(200).json(payload);
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed.' });
        return;
    }

    if (!apiKey) {
        res.status(500).json({ error: 'AI API key not configured.' });
        return;
    }

    const apiUrlOverride = process.env.HF_API_URL || process.env.AI_API_URL;
    const requestedModel = process.env.HF_MODEL || process.env.AI_MODEL;
    const fallbackModels = [
        requestedModel,
        'mistralai/Mistral-7B-Instruct-v0.2',
        'HuggingFaceH4/zephyr-7b-beta'
    ].filter(Boolean);
    const modelsToTry = apiUrlOverride ? [null] : Array.from(new Set(fallbackModels));
    const prompt = buildPrompt(req.body?.messages);
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
                res.status(500).json({ error: message, status: response.status });
                return;
            }

            const generated = Array.isArray(data) ? data[0]?.generated_text : data?.generated_text;
            const reply = String(generated || '').replace(prompt, '').trim();
            res.status(200).json({ reply });
            return;
        }

        if (lastError) {
            res.status(500).json({ error: lastError.message, status: lastError.status });
            return;
        }
    } catch (error) {
        res.status(502).json({ error: 'Unable to reach AI service.' });
    }
}
