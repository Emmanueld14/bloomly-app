import { BlogPostEditor } from './post-editor.js';

export function createPostEditor(options) {
    return new BlogPostEditor(options);
}

if (typeof window !== 'undefined') {
    window.BloomlyCMS = {
        createPostEditor,
    };
}
