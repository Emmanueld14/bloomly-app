/**
 * Test endpoint to verify Vercel functions are working
 * Access at: https://YOUR-VERCEL-URL.vercel.app/api/test
 */

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    return res.status(200).json({ 
        message: 'Vercel function is working!',
        timestamp: new Date().toISOString()
    });
}

