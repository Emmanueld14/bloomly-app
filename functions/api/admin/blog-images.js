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

async function ensureBlogImagesBucket(url, key) {
    const response = await fetch(`${url}/storage/v1/bucket`, {
        method: 'POST',
        headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            id: BUCKET,
            name: BUCKET,
            public: true,
            file_size_limit: MAX_BYTES,
            allowed_mime_types: Array.from(ALLOWED_TYPES),
        }),
    });
    if (response.ok || response.status === 409) return;
    const data = await response.json().catch(() => ({}));
    console.warn('[Bloomly Admin] Could not ensure blog-images bucket', {
        status: response.status,
        message: data.message || data.error,
    });
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

        await ensureBlogImagesBucket(url, key);

        const objectPath = buildObjectPath(file);
        const uploadUrl = `${url}/storage/v1/object/${BUCKET}/${objectPath}`;
        const uploadResponse = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                apikey: key,
                Authorization: `Bearer ${key}`,
                'Content-Type': file.type,
                'x-upsert': 'false',
            },
            body: await file.arrayBuffer(),
        });
        const uploadData = await uploadResponse.json().catch(() => ({}));
        if (!uploadResponse.ok) {
            console.error('[Bloomly Admin] Supabase storage upload failed', {
                status: uploadResponse.status,
                message: uploadData.message || uploadData.error,
                objectPath,
            });
            return jsonResponse({
                error: uploadData.message || uploadData.error || 'Image upload failed.',
                status: uploadResponse.status,
                objectPath,
            }, 400);
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
