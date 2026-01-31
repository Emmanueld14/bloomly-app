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

export default async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.status(204).end();
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed.' });
        return;
    }

    const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
        res.status(500).json({ error: 'AI API key not configured.' });
        return;
    }

    const apiUrl = process.env.AI_API_URL || 'https://api.openai.com/v1/chat/completions';
    const model = process.env.AI_MODEL || 'gpt-4o-mini';
    const payload = buildPayload(req.body?.messages, model);

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
            res.status(500).json({ error: message });
            return;
        }

        const reply = data?.choices?.[0]?.message?.content?.trim() || '';
        res.status(200).json({ reply });
    } catch (error) {
        res.status(502).json({ error: 'Unable to reach AI service.' });
    }
}
