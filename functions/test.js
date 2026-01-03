// Test function to verify Cloudflare Pages Functions are working
export async function onRequestGet() {
    return new Response(
        JSON.stringify({ message: 'Functions are working!', timestamp: new Date().toISOString() }),
        {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        }
    );
}

