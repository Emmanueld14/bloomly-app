export async function onRequest() {
    return new Response(JSON.stringify({
        error: 'This Cloudflare Pages route is deprecated. Use the Vercel /api/appointments-availability endpoint.'
    }), {
        status: 410,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
}
