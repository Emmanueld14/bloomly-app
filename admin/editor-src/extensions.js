import { mergeAttributes } from '@tiptap/core';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import StarterKit from '@tiptap/starter-kit';

function safeWidth(value) {
    const raw = String(value || '').trim();
    if (/^(100%|[1-9][0-9]{0,2}px|[1-9][0-9]?%)$/.test(raw)) return raw;
    return '100%';
}

export const ImageFigure = Image.extend({
    name: 'image',
    group: 'block',
    draggable: true,

    addAttributes() {
        return {
            ...this.parent?.(),
            width: {
                default: '100%',
                parseHTML: (element) => element.getAttribute('data-width') || element.style.width || '100%',
                renderHTML: (attributes) => ({
                    'data-width': safeWidth(attributes.width),
                }),
            },
            caption: {
                default: '',
                parseHTML: (element) => element.querySelector('figcaption')?.textContent?.trim() || '',
                renderHTML: () => ({}),
            },
            align: {
                default: 'center',
                parseHTML: (element) => element.getAttribute('data-align') || 'center',
                renderHTML: (attributes) => ({
                    'data-align': ['left', 'center', 'right'].includes(attributes.align) ? attributes.align : 'center',
                }),
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'figure[data-type="image"]',
                getAttrs: (element) => {
                    const img = element.querySelector('img');
                    if (!img?.getAttribute('src')) return false;
                    return {
                        src: img.getAttribute('src'),
                        alt: img.getAttribute('alt') || '',
                        title: img.getAttribute('title') || '',
                        width: element.getAttribute('data-width') || element.style.width || '100%',
                        caption: element.querySelector('figcaption')?.textContent?.trim() || '',
                        align: element.getAttribute('data-align') || 'center',
                    };
                },
            },
            { tag: 'img[src]' },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        const { caption, width, align, src, alt, title } = HTMLAttributes;
        const attrs = mergeAttributes({
            'data-type': 'image',
            'data-align': ['left', 'center', 'right'].includes(align) ? align : 'center',
            'data-width': safeWidth(width),
            class: 'cms-image',
            style: `width: ${safeWidth(width)}`,
        });

        const imageAttrs = {
            src,
            alt: alt || '',
            title: title || null,
            loading: 'lazy',
            decoding: 'async',
        };

        return [
            'figure',
            attrs,
            ['img', imageAttrs],
            caption ? ['figcaption', {}, caption] : ['figcaption', { 'data-placeholder': 'Write a caption...' }, ''],
        ];
    },
});

export function createEditorExtensions() {
    return [
        StarterKit.configure({
            heading: { levels: [1, 2, 3] },
            horizontalRule: {
                HTMLAttributes: {
                    class: 'cms-divider',
                },
            },
        }),
        Underline,
        Link.configure({
            autolink: true,
            openOnClick: false,
            defaultProtocol: 'https',
            HTMLAttributes: {
                rel: 'noopener noreferrer',
                target: '_blank',
            },
        }),
        Placeholder.configure({
            placeholder: ({ node }) => {
                if (node.type.name === 'heading') return 'Heading';
                return "Start writing, or type '/' for commands...";
            },
        }),
        TextAlign.configure({
            types: ['heading', 'paragraph'],
        }),
        ImageFigure.configure({
            allowBase64: false,
            inline: false,
        }),
        Table.configure({
            resizable: true,
            HTMLAttributes: {
                class: 'cms-table',
            },
        }),
        TableRow,
        TableHeader,
        TableCell,
    ];
}
