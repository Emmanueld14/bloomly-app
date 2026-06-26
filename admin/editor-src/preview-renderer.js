import { sanitizeHTML, textFromHTML } from './html-sanitize.js';

function escapeHTML(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function estimateReadingTime(text) {
    const words = String(text || '').trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 220));
}

export function createExcerpt(text, limit = 220) {
    const normalized = String(text || '').replace(/\s+/g, ' ').trim();
    if (normalized.length <= limit) return normalized;
    return `${normalized.slice(0, limit).trim()}...`;
}

export function renderPreview({ container, title, category, coverImageUrl, html, readTime }) {
    if (!container) return;
    const safeHTML = sanitizeHTML(html);
    const safeCover = coverImageUrl && /^https?:\/\//.test(coverImageUrl) ? coverImageUrl : '';
    container.innerHTML = `
        <article class="cms-preview-article">
            ${safeCover ? `<img class="cms-preview-cover" src="${escapeHTML(safeCover)}" alt="">` : ''}
            <p class="cms-preview-kicker">${escapeHTML(category || 'Mental Health')} • ${readTime || 1} min read</p>
            <h1>${escapeHTML(title || 'Untitled post')}</h1>
            <div class="cms-preview-body">${safeHTML || '<p>Start writing to preview your post.</p>'}</div>
        </article>
    `;
}

export function getPlainTextFromHTML(html) {
    return textFromHTML(html);
}
