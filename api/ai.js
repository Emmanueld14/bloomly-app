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

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed.' });
        return;
    }

    const apiKey = process.env.HF_API_KEY || process.env.HUGGINGFACE_API_KEY;
    if (!apiKey) {
        res.status(500).json({ error: 'Hugging Face API key not configured.' });
        return;
    }

    const model = process.env.HF_MODEL || 'deepseek-ai/DeepSeek-R1-Distill-Qwen-32B';
    const apiUrl = process.env.HF_API_URL || `https://api-inference.huggingface.co/models/${model}`;
    const prompt = buildPrompt(req.body?.messages);
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
            res.status(500).json({ error: message });
            return;
        }

        const generated = Array.isArray(data) ? data[0]?.generated_text : data?.generated_text;
        const reply = String(generated || '').replace(prompt, '').trim();
        res.status(200).json({ reply });
    } catch (error) {
        res.status(502).json({ error: 'Unable to reach AI service.' });
    }
}
