export async function onRequestPost() {
  return new Response(JSON.stringify({
    error: 'M-Pesa callbacks must target the Node /api/mpesa-callback endpoint.'
  }), {
    status: 501,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}
