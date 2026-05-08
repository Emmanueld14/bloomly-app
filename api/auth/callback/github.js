export default async function handler(req, res) {
    const query = new URLSearchParams();
    ['code', 'state', 'error', 'error_description'].forEach((key) => {
        if (req.query[key]) {
            query.set(key, String(req.query[key]));
        }
    });

    const suffix = query.toString() ? `?${query.toString()}` : '';
    res.writeHead(302, {
        Location: `/admin/callback.html${suffix}`,
        'Cache-Control': 'no-store'
    });
    res.end();
}
