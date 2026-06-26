const URL_ATTRS = new Set(['href', 'src']);

const ALLOWED_TAGS = new Set([
    'a',
    'blockquote',
    'br',
    'caption',
    'code',
    'col',
    'colgroup',
    'div',
    'em',
    'figcaption',
    'figure',
    'h1',
    'h2',
    'h3',
    'hr',
    'img',
    'li',
    'ol',
    'p',
    'pre',
    'span',
    'strong',
    'table',
    'tbody',
    'td',
    'th',
    'thead',
    'tr',
    'u',
    'ul',
]);

const ALLOWED_ATTRS = new Set([
    'alt',
    'class',
    'colspan',
    'data-align',
    'data-type',
    'decoding',
    'height',
    'href',
    'loading',
    'rel',
    'rowspan',
    'src',
    'style',
    'target',
    'title',
    'width',
]);

function isSafeUrl(value) {
    if (!value) return false;
    try {
        const url = new URL(value, window.location.origin);
        return ['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol);
    } catch {
        return false;
    }
}

function sanitizeStyle(value) {
    const rules = String(value || '')
        .split(';')
        .map((rule) => rule.trim())
        .filter(Boolean);
    const safeRules = [];

    rules.forEach((rule) => {
        const [propRaw, valRaw] = rule.split(':');
        const prop = String(propRaw || '').trim().toLowerCase();
        const val = String(valRaw || '').trim();
        if (prop === 'width' && /^(100%|[1-9][0-9]{0,2}px|[1-9][0-9]?%)$/.test(val)) {
            safeRules.push(`width: ${val}`);
        }
        if (prop === 'text-align' && /^(left|center|right)$/.test(val)) {
            safeRules.push(`text-align: ${val}`);
        }
    });

    return safeRules.join('; ');
}

function cleanElement(element) {
    Array.from(element.children).forEach(cleanElement);

    const tag = element.tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) {
        element.replaceWith(...Array.from(element.childNodes));
        return;
    }

    Array.from(element.attributes).forEach((attr) => {
        const name = attr.name.toLowerCase();
        const value = attr.value;
        if (!ALLOWED_ATTRS.has(name) || name.startsWith('on')) {
            element.removeAttribute(attr.name);
            return;
        }
        if (URL_ATTRS.has(name) && !isSafeUrl(value)) {
            element.removeAttribute(attr.name);
            return;
        }
        if (name === 'style') {
            const safeStyle = sanitizeStyle(value);
            if (safeStyle) element.setAttribute('style', safeStyle);
            else element.removeAttribute('style');
        }
    });

    if (tag === 'a') {
        element.setAttribute('rel', 'noopener noreferrer');
        if (element.getAttribute('href')?.startsWith('http')) {
            element.setAttribute('target', '_blank');
        }
    }

    if (tag === 'img') {
        element.setAttribute('loading', 'lazy');
        element.setAttribute('decoding', 'async');
        if (!element.getAttribute('alt')) element.setAttribute('alt', '');
    }
}

export function sanitizeHTML(html) {
    if (!html || typeof window === 'undefined' || typeof DOMParser === 'undefined') {
        return '';
    }
    const template = document.createElement('template');
    template.innerHTML = String(html);
    Array.from(template.content.children).forEach(cleanElement);
    return template.innerHTML;
}

export function textFromHTML(html) {
    if (!html || typeof document === 'undefined') return '';
    const template = document.createElement('template');
    template.innerHTML = sanitizeHTML(html);
    return (template.content.textContent || '').replace(/\s+/g, ' ').trim();
}
