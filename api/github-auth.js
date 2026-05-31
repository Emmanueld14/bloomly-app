/**
 * Vercel Serverless Function - GitHub OAuth Token Exchange
 * This file should be deployed to Vercel (free tier) to handle OAuth
 * 
 * To deploy:
 * 1. Create account at vercel.com
 * 2. Import your GitHub repository
 * 3. Vercel will automatically detect this api/ folder
 * 4. Add environment variables: GITHUB_ID/GITHUB_CLIENT_ID and GITHUB_SECRET/GITHUB_CLIENT_SECRET
 */

export default async function handler(req, res) {
    // Enable CORS - MUST be set before any other response
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
    
    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        return res.status(200).json({ message: 'OK' });
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { code, redirect_uri } = req.body;
        
        if (!code) {
            return res.status(400).json({ error: 'Missing authorization code' });
        }
        
        const clientId = process.env.GITHUB_ID || process.env.GITHUB_CLIENT_ID || req.body.client_id;
        const clientSecret = process.env.GITHUB_SECRET || process.env.GITHUB_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            return res.status(500).json({
                error: 'OAuth server misconfiguration: set GITHUB_ID/GITHUB_CLIENT_ID and GITHUB_SECRET/GITHUB_CLIENT_SECRET on the host'
            });
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
        
        const tokenData = await tokenResponse.json();
        
        if (tokenData.error) {
            return res.status(400).json({ 
                error: tokenData.error_description || tokenData.error 
            });
        }
        
        if (!tokenData.access_token) {
            return res.status(500).json({ error: 'No access token in response' });
        }

        const allowedEmails = [
            'manuel.muh@lightacademynairobi.sc.ke',
            'manuelmuhunami@gmail.com',
            'muhunanim@gmail.com',
        ];

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

        const isAllowed = allowedEmails.some((email) => email.toLowerCase() === primaryEmail);
        if (!isAllowed) {
            return res.status(403).json({
                error: 'Access denied. This account is not authorized.',
                code: 'AccessDenied',
            });
        }
        
        return res.status(200).json({
            access_token: tokenData.access_token,
            email: primaryEmail,
            login: user.login || '',
        });
    } catch (error) {
        console.error('OAuth error:', error);
        return res.status(500).json({ error: error.message });
    }
}

