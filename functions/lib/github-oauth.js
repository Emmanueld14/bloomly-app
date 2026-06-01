const ALLOWED_EMAILS = [
    'manuel.muh@lightacademynairobi.sc.ke',
    'manuelmuhunami@gmail.com',
    'muhunanim@gmail.com',
];

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
};

function jsonResponse(body, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            'Content-Type': 'application/json',
            ...CORS_HEADERS,
        },
    });
}

export async function handleGitHubOAuthPost({ request, env }) {
    try {
        const body = await request.json();
        const { code, redirect_uri } = body;

        if (!code) {
            return jsonResponse({ error: 'Missing authorization code' }, 400);
        }

        const clientId = env.GITHUB_ID || env.GITHUB_CLIENT_ID || body.client_id;
        const clientSecret = env.GITHUB_SECRET || env.GITHUB_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            return jsonResponse({
                error: 'Missing OAuth credentials',
                hint: 'Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in Cloudflare Pages environment variables',
            }, 500);
        }

        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({
                client_id: clientId,
                client_secret: clientSecret,
                code,
                redirect_uri,
            }),
        });

        const tokenText = await tokenResponse.text();
        let tokenData;
        try {
            tokenData = JSON.parse(tokenText);
        } catch {
            return jsonResponse({ error: 'Invalid response from GitHub' }, 500);
        }

        if (tokenData.error) {
            return jsonResponse({
                error: tokenData.error_description || tokenData.error,
            }, 400);
        }

        if (!tokenData.access_token) {
            return jsonResponse({ error: 'No access token in response' }, 500);
        }

        const userRes = await fetch('https://api.github.com/user', {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
                Accept: 'application/vnd.github+json',
                'User-Agent': 'Bloomly-Admin',
            },
        });
        const user = userRes.ok ? await userRes.json() : {};

        const emailsRes = await fetch('https://api.github.com/user/emails', {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
                Accept: 'application/vnd.github+json',
                'User-Agent': 'Bloomly-Admin',
            },
        });
        const emails = emailsRes.ok ? await emailsRes.json() : [];
        const primaryEmail = (
            emails.find((entry) => entry.primary)?.email ||
            emails[0]?.email ||
            user.email ||
            ''
        ).toLowerCase();

        const isAllowed = ALLOWED_EMAILS.some((email) => email.toLowerCase() === primaryEmail);
        if (!isAllowed) {
            return jsonResponse({
                error: 'Access denied. This account is not authorized.',
                code: 'AccessDenied',
            }, 403);
        }

        return jsonResponse({
            access_token: tokenData.access_token,
            email: primaryEmail,
            login: user.login || '',
        });
    } catch (error) {
        return jsonResponse({ error: error.message || 'OAuth exchange failed' }, 500);
    }
}

export function handleGitHubOAuthOptions() {
    return new Response(null, { headers: CORS_HEADERS });
}
