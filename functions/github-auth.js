/**
 * Cloudflare Pages Function - GitHub OAuth Token Exchange
 * Handles the server-side token exchange to avoid CORS issues
 */

export async function onRequestPost({ request, env }) {
    
    try {
        const body = await request.json();
        const { code, redirect_uri } = body;
        
        if (!code) {
            return new Response(
                JSON.stringify({ error: 'Missing authorization code' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }
        
        // Get credentials from environment variables or request body
        // For now, we'll pass them from the client (not ideal but works)
        const clientId = body.client_id || env.GITHUB_CLIENT_ID;
        const clientSecret = body.client_secret || env.GITHUB_CLIENT_SECRET;
        
        if (!clientId || !clientSecret) {
            return new Response(
                JSON.stringify({ error: 'Missing OAuth credentials' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }
        
        // Exchange code for access token
        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                client_id: clientId,
                client_secret: clientSecret,
                code: code,
                redirect_uri: redirect_uri
            })
        });
        
        const tokenText = await tokenResponse.text();
        let tokenData;
        
        try {
            tokenData = JSON.parse(tokenText);
        } catch (e) {
            return new Response(
                JSON.stringify({ error: 'Invalid response from GitHub: ' + tokenText.substring(0, 100) }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        }
        
        if (tokenData.error) {
            return new Response(
                JSON.stringify({ error: tokenData.error_description || tokenData.error }),
                { 
                    status: 400, 
                    headers: { 
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    } 
                }
            );
        }
        
        if (!tokenData.access_token) {
            return new Response(
                JSON.stringify({ error: 'No access token in response' }),
                { 
                    status: 500, 
                    headers: { 
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    } 
                }
            );
        }
        
        // Return the access token
        return new Response(
            JSON.stringify({ access_token: tokenData.access_token }),
            { 
                status: 200,
                headers: { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                }
            }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

// Handle OPTIONS for CORS preflight
export async function onRequestOptions() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
    });
}

