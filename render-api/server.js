/**
 * Render.com Express Server for GitHub OAuth
 * Deploy this to Render.com (free tier)
 * 
 * Setup:
 * 1. Go to render.com and sign up
 * 2. Create a new "Web Service"
 * 3. Connect your GitHub repo
 * 4. Set:
 *    - Build Command: npm install
 *    - Start Command: node server.js
 * 5. Add environment variables:
 *    - GITHUB_CLIENT_ID
 *    - GITHUB_CLIENT_SECRET
 */

const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// GitHub OAuth token exchange endpoint
app.post('/api/github-auth', async (req, res) => {
    try {
        const { code, redirect_uri } = req.body;
        
        if (!code) {
            return res.status(400).json({ error: 'Missing authorization code' });
        }
        
        const clientId = process.env.GITHUB_CLIENT_ID || req.body.client_id;
        const clientSecret = process.env.GITHUB_CLIENT_SECRET || req.body.client_secret;
        
        if (!clientId || !clientSecret) {
            return res.status(400).json({ error: 'Missing OAuth credentials' });
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
        
        return res.status(200).json({ access_token: tokenData.access_token });
    } catch (error) {
        console.error('OAuth error:', error);
        return res.status(500).json({ error: error.message });
    }
});

// Test endpoint
app.get('/api/test', (req, res) => {
    res.json({ 
        message: 'Render API is working!',
        timestamp: new Date().toISOString()
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

