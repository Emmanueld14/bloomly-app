import {
    getSupabaseConfig,
    jsonResponse,
    optionsResponse,
    requireAdmin,
} from '../../lib/admin-api.js';

const BUCKET = 'blog-images';
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

export async function onRequestOptions() {
    return optionsResponse();
}

function extensionFor(file) {
    const byType = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/webp': 'webp',
    };
    return byType[file.type] || file.name.split('.').pop()?.toLowerCase() || 'jpg';
}

function buildObjectPath(file) {
    const now = new Date();
    const year = String(now.getUTCFullYear());
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const safeName =
        file.name
            .replace(/\.[^.]+$/, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 48) || 'image';
    return `${year}/${month}/${crypto.randomUUID()}-${safeName}.${extensionFor(file)}`;
}

export async function onRequest(context) {
    const { request, env } = context;
    const gate = await requireAdmin(request, env);
    if (gate.errorResponse) return gate.errorResponse;
    if (request.method !== 'POST') {
        return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    try {
        const form = await request.formData();
        const file = form.get('file');
        if (!(file instanceof File)) {
            return jsonResponse({ error: 'Image file is required.' }, 400);
        }
        if (!ALLOWED_TYPES.has(file.type)) {
            return jsonResponse({ error: 'Only JPG, PNG, GIF, and WebP images are allowed.' }, 400);
        }
        if (file.size > MAX_BYTES) {
            return jsonResponse({ error: 'Image is too large. Please keep uploads under 10 MB.' }, 400);
        }

        const { url, key } = getSupabaseConfig(env);
        if (!url || !key) {
            return jsonResponse({ error: 'Supabase storage is not configured.' }, 500);
        }

        const objectPath = buildObjectPath(file);
        const uploadUrl = `${url}/storage/v1/object/${BUCKET}/${objectPath}`;
        const uploadResponse = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                apikey: key,
                Authorization: `Bearer ${key}`,
                'Content-Type': file.type,
            },
            body: await file.arrayBuffer(),
        });
        const uploadData = await uploadResponse.json().catch(() => ({}));
        if (!uploadResponse.ok) {
            return jsonResponse({ error: uploadData.message || 'Image upload failed.' }, 400);
        }

        return jsonResponse({
            bucket: BUCKET,
            path: `${BUCKET}/${objectPath}`,
            objectPath,
            url: `${url}/storage/v1/object/public/${BUCKET}/${objectPath}`,
        });
    } catch (error) {
        return jsonResponse({ error: error.message || 'Image upload failed.' }, 500);
    }
}
