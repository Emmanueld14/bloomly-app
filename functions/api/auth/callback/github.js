export async function onRequestGet({ request }) {
    const url = new URL(request.url);
    const target = new URL('/admin/callback.html', url.origin);
    ['code', 'state', 'error', 'error_description'].forEach((key) => {
        const value = url.searchParams.get(key);
        if (value) target.searchParams.set(key, value);
    });
    return Response.redirect(target.toString(), 302);
}
