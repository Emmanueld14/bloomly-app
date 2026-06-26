const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export function validateImageFile(file) {
    if (!file) throw new Error('Choose an image to upload.');
    if (!IMAGE_TYPES.has(file.type)) {
        throw new Error('Please upload a JPG, PNG, GIF, or WebP image.');
    }
    if (file.size > MAX_IMAGE_BYTES) {
        throw new Error('Image is too large. Please keep uploads under 10 MB.');
    }
}

export async function uploadImageToSupabase({ file, urls, token, anonKey }) {
    validateImageFile(file);

    const formData = new FormData();
    formData.append('file', file);

    let lastError = null;
    for (const url of urls) {
        try {
            const isSupabase = url.includes('supabase.co');
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    ...(isSupabase && anonKey ? { apikey: anonKey } : {}),
                },
                body: formData,
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                lastError = new Error(data.error || `Image upload failed (${response.status})`);
                continue;
            }
            if (!data.url) {
                lastError = new Error('Image upload did not return a public URL.');
                continue;
            }
            return data;
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError || new Error('Image upload failed.');
}

export function createHiddenImageInput(onPick) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/gif,image/webp';
    input.hidden = true;
    input.addEventListener('change', () => {
        const file = input.files?.[0];
        input.value = '';
        if (file) void onPick(file);
    });
    document.body.appendChild(input);
    return input;
}
