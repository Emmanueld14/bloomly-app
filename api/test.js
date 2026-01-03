/**
 * Test endpoint to verify Vercel functions are working
 * Access at: https://YOUR-VERCEL-URL.vercel.app/api/test
 */

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
    res.setHeader('Access-Control-Max-Age', '86400');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).json({ message: 'OK' });
    }
    
    return res.status(200).json({ 
        message: 'Vercel function is working!',
        timestamp: new Date().toISOString()
    });
}

