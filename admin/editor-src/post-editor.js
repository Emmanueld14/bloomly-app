import { Editor } from '@tiptap/core';
import { createEditorExtensions } from './extensions.js';
import { EditorAutosave, debounce } from './autosave.js';
import { createExcerpt, estimateReadingTime, getPlainTextFromHTML, renderPreview } from './preview-renderer.js';
import { createHiddenImageInput, validateImageFile } from './upload.js';
import { sanitizeHTML } from './html-sanitize.js';

const EMPTY_DOC = {
    type: 'doc',
    content: [
        {
            type: 'paragraph',
        },
    ],
};

function slugify(value) {
    return String(value || '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function normalizeTags(value) {
    return String(value || '')
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 12);
}

function formatTags(tags) {
    return Array.isArray(tags) ? tags.join(', ') : String(tags || '');
}

function setIfPresent(element, value) {
    if (element) element.value = value ?? '';
}

function getField(root, selector) {
    return root.querySelector(selector);
}

export class BlogPostEditor {
    constructor({ root, api, uploadImage, onSaved, notify }) {
        this.root = root;
        this.api = api;
        this.uploadImage = uploadImage;
        this.onSaved = onSaved || (() => {});
        this.notify = notify || (() => {});
        this.currentPost = null;
        this.previewMode = false;
        this.isUploading = false;
        this.autosave = new EditorAutosave({
            onStatus: (message) => this.setSaveStatus(message),
        });
        this.imageInput = createHiddenImageInput((file) => this.insertImageFromFile(file));
        this.handleDocumentKeydown = this.handleDocumentKeydown.bind(this);
        this.updatePreview = debounce(() => this.renderPreview(), 250);
        this.scheduleAutosave = debounce(() => {
            const payload = this.getPayload();
            this.autosave.schedule(payload.slug || payload.id || 'new', payload);
            if (payload.id) void this.save({ silent: true, autosave: true });
        }, 1600);
        this.initEditor();
        this.bindUI();
    }

    initEditor() {
        const editorElement = getField(this.root, '[data-rich-editor]');
        this.editor = new Editor({
            element: editorElement,
            extensions: createEditorExtensions(),
            content: EMPTY_DOC,
            editorProps: {
                attributes: {
                    class: 'cms-prose-editor',
                    spellcheck: 'true',
                },
                handleDrop: (_view, event) => {
                    const file = Array.from(event.dataTransfer?.files || []).find((item) =>
                        item.type?.startsWith('image/')
                    );
                    if (!file) return false;
                    event.preventDefault();
                    void this.insertImageFromFile(file);
                    return true;
                },
                handlePaste: (_view, event) => {
                    const file = Array.from(event.clipboardData?.files || []).find((item) =>
                        item.type?.startsWith('image/')
                    );
                    if (!file) return false;
                    event.preventDefault();
                    void this.insertImageFromFile(file);
                    return true;
                },
            },
            onUpdate: () => {
                this.refreshDerivedState();
                this.scheduleAutosave();
                this.updatePreview();
            },
            onSelectionUpdate: () => this.updateToolbarState(),
        });
    }

    bindUI() {
        this.root.querySelectorAll('[data-editor-command]').forEach((button) => {
            button.addEventListener('click', () => this.runCommand(button.dataset.editorCommand));
        });

        getField(this.root, '[data-close-editor]')?.addEventListener('click', () => this.close());
        this.root.querySelectorAll('[data-save-post]').forEach((button) => {
            button.addEventListener('click', () => void this.save());
        });
        this.root.querySelectorAll('[data-publish-post]').forEach((button) => {
            button.addEventListener('click', () => void this.save({ publish: true }));
        });
        this.root.querySelectorAll('[data-preview-toggle]').forEach((button) => {
            button.addEventListener('click', () => this.togglePreview());
        });
        getField(this.root, '[data-cover-upload]')?.addEventListener('click', () => this.pickCoverImage());

        getField(this.root, '#postTitle')?.addEventListener('input', (event) => {
            const slug = getField(this.root, '#postSlug');
            if (slug && !slug.dataset.touched) slug.value = slugify(event.target.value);
            this.refreshDerivedState();
            this.scheduleAutosave();
        });

        getField(this.root, '#postSlug')?.addEventListener('input', (event) => {
            event.target.dataset.touched = 'true';
            event.target.value = slugify(event.target.value);
            this.scheduleAutosave();
        });

        this.root.querySelectorAll('[data-editor-field]').forEach((field) => {
            field.addEventListener('input', () => {
                this.refreshDerivedState();
                this.scheduleAutosave();
                this.updatePreview();
            });
            field.addEventListener('change', () => {
                this.refreshDerivedState();
                this.scheduleAutosave();
                this.updatePreview();
            });
        });

        this.editor.view.dom.addEventListener('keyup', (event) => this.handleSlashKeyup(event));
        this.root.addEventListener('click', (event) => {
            const item = event.target.closest('[data-slash-command]');
            if (item) {
                this.runSlashCommand(item.dataset.slashCommand);
            }
        });
    }

    open(post = null) {
        this.currentPost = post || null;
        this.root.hidden = false;
        this.root.classList.add('is-open');
        document.body.classList.add('cms-editor-open');
        document.addEventListener('keydown', this.handleDocumentKeydown);
        this.populate(post);
        window.setTimeout(() => getField(this.root, '#postTitle')?.focus(), 50);
    }

    close() {
        this.hideSlashMenu();
        this.root.classList.remove('is-open');
        this.root.hidden = true;
        document.body.classList.remove('cms-editor-open');
        document.removeEventListener('keydown', this.handleDocumentKeydown);
    }

    populate(post) {
        const isGithubOnly = post?.source === 'github' || String(post?.id || '').startsWith('github:');
        setIfPresent(getField(this.root, '#postId'), isGithubOnly ? '' : post?.id || '');
        setIfPresent(getField(this.root, '#postTitle'), post?.title || '');
        setIfPresent(getField(this.root, '#postSlug'), post?.slug || '');
        setIfPresent(getField(this.root, '#postCategory'), post?.category || 'Mental Health');
        setIfPresent(getField(this.root, '#postEmoji'), post?.emoji || 'Bloomly');
        setIfPresent(getField(this.root, '#postTags'), formatTags(post?.tags));
        setIfPresent(getField(this.root, '#seoTitle'), post?.seo_title || post?.title || '');
        setIfPresent(getField(this.root, '#metaDescription'), post?.meta_description || post?.excerpt || post?.summary || '');
        setIfPresent(getField(this.root, '#coverImageUrl'), post?.cover_image_url || post?.featuredImage || '');
        setIfPresent(getField(this.root, '#scheduledAt'), post?.scheduled_at ? String(post.scheduled_at).slice(0, 16) : '');

        const status = post?.status || (post && (post.published === true || post.published === 'true') ? 'published' : 'draft');
        const statusField = getField(this.root, '#postStatus');
        if (statusField) statusField.value = ['draft', 'published', 'scheduled'].includes(status) ? status : 'draft';

        const slug = getField(this.root, '#postSlug');
        if (slug) delete slug.dataset.touched;

        const content = post?.content_json || post?.content_html || post?.content || EMPTY_DOC;
        this.editor.commands.setContent(content || EMPTY_DOC, false);
        this.refreshDerivedState();
        this.renderPreview();
        this.setSaveStatus(post?.id ? 'Loaded from Supabase' : 'New draft');
    }

    handleDocumentKeydown(event) {
        const isMod = event.metaKey || event.ctrlKey;
        if (event.key === 'Escape') {
            this.close();
            return;
        }
        if (isMod && event.key.toLowerCase() === 's') {
            event.preventDefault();
            void this.save();
        }
        if (isMod && event.shiftKey && event.key.toLowerCase() === 'p') {
            event.preventDefault();
            this.togglePreview();
        }
        if (isMod && event.key.toLowerCase() === 'k') {
            event.preventDefault();
            getField(this.root, '#postTitle')?.focus();
        }
    }

    runCommand(command) {
        const chain = this.editor.chain().focus();
        const commands = {
            undo: () => this.editor.chain().focus().undo().run(),
            redo: () => this.editor.chain().focus().redo().run(),
            h1: () => chain.toggleHeading({ level: 1 }).run(),
            h2: () => chain.toggleHeading({ level: 2 }).run(),
            h3: () => chain.toggleHeading({ level: 3 }).run(),
            bold: () => chain.toggleBold().run(),
            italic: () => chain.toggleItalic().run(),
            underline: () => chain.toggleUnderline().run(),
            quote: () => chain.toggleBlockquote().run(),
            bulletList: () => chain.toggleBulletList().run(),
            orderedList: () => chain.toggleOrderedList().run(),
            codeBlock: () => chain.toggleCodeBlock().run(),
            divider: () => chain.setHorizontalRule().run(),
            table: () => chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
            image: () => this.imageInput.click(),
            link: () => this.setLink(),
            alignLeft: () => chain.setTextAlign('left').run(),
            alignCenter: () => chain.setTextAlign('center').run(),
            alignRight: () => chain.setTextAlign('right').run(),
        };
        commands[command]?.();
        this.updateToolbarState();
    }

    setLink() {
        const previousUrl = this.editor.getAttributes('link').href || '';
        const url = window.prompt('Paste a link URL', previousUrl);
        if (url === null) return;
        if (!url.trim()) {
            this.editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }
        this.editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
    }

    async insertImageFromFile(file) {
        if (this.isUploading) return;
        this.isUploading = true;
        this.setSaveStatus('Uploading image...');
        this.setUploadProgress(12, 'Preparing image...');
        this.root.classList.add('is-uploading');
        try {
            validateImageFile(file);
            const uploaded = await this.uploadImage(file, {
                onProgress: ({ percent, message }) => this.setUploadProgress(percent, message),
            });
            this.editor
                .chain()
                .focus()
                .setImage({
                    src: uploaded.url,
                    alt: file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '),
                    width: '100%',
                    caption: '',
                    align: 'center',
                })
                .run();
            this.setSaveStatus('Image inserted');
            this.notify('Image uploaded and inserted.', 'success');
        } catch (error) {
            this.setSaveStatus(error.message || 'Image upload failed');
            this.notify(error.message || 'Image upload failed.', 'error');
        } finally {
            this.isUploading = false;
            this.root.classList.remove('is-uploading');
            window.setTimeout(() => this.hideUploadProgress(), 700);
        }
    }

    pickCoverImage() {
        const input = createHiddenImageInput(async (file) => {
            this.setSaveStatus('Uploading cover image...');
            this.setUploadProgress(12, 'Preparing cover image...');
            try {
                validateImageFile(file);
                const uploaded = await this.uploadImage(file, {
                    onProgress: ({ percent, message }) => this.setUploadProgress(percent, message),
                });
                setIfPresent(getField(this.root, '#coverImageUrl'), uploaded.url);
                this.refreshDerivedState();
                this.renderPreview();
                this.scheduleAutosave();
                this.setSaveStatus('Cover image uploaded');
                this.notify('Cover image uploaded.', 'success');
            } catch (error) {
                this.setSaveStatus(error.message || 'Cover upload failed');
                this.notify(error.message || 'Cover upload failed.', 'error');
            } finally {
                input.remove();
                window.setTimeout(() => this.hideUploadProgress(), 700);
            }
        });
        input.click();
    }

    handleSlashKeyup(event) {
        if (event.key !== '/' && event.key !== ' ') return;
        const { state } = this.editor;
        const parentText = state.selection.$from.parent.textContent || '';
        if (!parentText.trim().startsWith('/')) {
            this.hideSlashMenu();
            return;
        }
        this.showSlashMenu();
    }

    showSlashMenu() {
        const menu = getField(this.root, '[data-slash-menu]');
        if (!menu) return;
        menu.hidden = false;
    }

    hideSlashMenu() {
        const menu = getField(this.root, '[data-slash-menu]');
        if (menu) menu.hidden = true;
    }

    clearSlashText() {
        const { state } = this.editor;
        const from = state.selection.$from.start();
        const to = state.selection.$from.pos;
        this.editor.commands.deleteRange({ from, to });
    }

    runSlashCommand(command) {
        this.clearSlashText();
        this.hideSlashMenu();
        const map = {
            image: () => this.runCommand('image'),
            quote: () => this.runCommand('quote'),
            h2: () => this.runCommand('h2'),
            divider: () => this.runCommand('divider'),
            code: () => this.runCommand('codeBlock'),
            table: () => this.runCommand('table'),
        };
        map[command]?.();
    }

    updateToolbarState() {
        this.root.querySelectorAll('[data-editor-command]').forEach((button) => {
            const command = button.dataset.editorCommand;
            const activeMap = {
                bold: () => this.editor.isActive('bold'),
                italic: () => this.editor.isActive('italic'),
                underline: () => this.editor.isActive('underline'),
                h1: () => this.editor.isActive('heading', { level: 1 }),
                h2: () => this.editor.isActive('heading', { level: 2 }),
                h3: () => this.editor.isActive('heading', { level: 3 }),
                quote: () => this.editor.isActive('blockquote'),
                bulletList: () => this.editor.isActive('bulletList'),
                orderedList: () => this.editor.isActive('orderedList'),
                codeBlock: () => this.editor.isActive('codeBlock'),
            };
            button.classList.toggle('is-active', Boolean(activeMap[command]?.()));
        });
    }

    refreshDerivedState() {
        const html = sanitizeHTML(this.editor.getHTML());
        const text = getPlainTextFromHTML(html);
        const readTime = estimateReadingTime(text);
        this.root.querySelectorAll('[data-reading-time]').forEach((readTimeEl) => {
            readTimeEl.textContent = `${readTime} min read`;
        });

        const cover = getField(this.root, '#coverImageUrl')?.value || '';
        const preview = getField(this.root, '[data-cover-preview]');
        if (preview) {
            preview.innerHTML = '';
            if (cover && /^https?:\/\//.test(cover)) {
                const img = document.createElement('img');
                img.src = cover;
                img.alt = '';
                preview.appendChild(img);
            } else {
                const span = document.createElement('span');
                span.textContent = 'Drop in a cover image for richer previews.';
                preview.appendChild(span);
            }
        }
    }

    renderPreview() {
        const html = sanitizeHTML(this.editor.getHTML());
        const text = getPlainTextFromHTML(html);
        renderPreview({
            container: getField(this.root, '[data-post-preview]'),
            title: getField(this.root, '#postTitle')?.value,
            category: getField(this.root, '#postCategory')?.value,
            coverImageUrl: getField(this.root, '#coverImageUrl')?.value,
            html,
            readTime: estimateReadingTime(text),
        });
    }

    togglePreview() {
        this.previewMode = !this.previewMode;
        this.root.classList.toggle('is-previewing', this.previewMode);
        this.root.querySelectorAll('[data-preview-toggle]').forEach((button) => {
            button.textContent = this.previewMode ? 'Edit mode' : 'Live preview';
        });
        if (this.previewMode) this.renderPreview();
    }

    getPayload() {
        const id = getField(this.root, '#postId')?.value || '';
        const title = getField(this.root, '#postTitle')?.value.trim() || 'Untitled post';
        const slug = slugify(getField(this.root, '#postSlug')?.value || title);
        const html = sanitizeHTML(this.editor.getHTML());
        const text = getPlainTextFromHTML(html);
        const status = getField(this.root, '#postStatus')?.value || 'draft';
        const excerpt = createExcerpt(getField(this.root, '#metaDescription')?.value || text);

        return {
            ...(id ? { id: Number(id) } : {}),
            title,
            slug,
            category: getField(this.root, '#postCategory')?.value || 'Mental Health',
            emoji: getField(this.root, '#postEmoji')?.value || 'Bloomly',
            content: text,
            content_json: this.editor.getJSON(),
            content_html: html,
            excerpt,
            summary: excerpt,
            tags: normalizeTags(getField(this.root, '#postTags')?.value),
            seo_title: getField(this.root, '#seoTitle')?.value.trim() || title,
            meta_description: getField(this.root, '#metaDescription')?.value.trim() || excerpt,
            cover_image_url: getField(this.root, '#coverImageUrl')?.value.trim() || null,
            status,
            published: status === 'published',
            scheduled_at: status === 'scheduled' ? getField(this.root, '#scheduledAt')?.value || null : null,
            read_time_minutes: estimateReadingTime(text),
        };
    }

    validatePayload(payload, { publish = false } = {}) {
        const errors = [];
        if (!payload.title || payload.title === 'Untitled post') errors.push('Add a title before saving.');
        if (!payload.slug) errors.push('A valid slug is required.');
        if (publish) {
            const hasText = Boolean(String(payload.content || '').trim());
            const hasImage = /<img\s/i.test(payload.content_html || '');
            if (!hasText && !hasImage) errors.push('Add content before publishing.');
        }
        if (payload.status === 'scheduled' && !payload.scheduled_at) {
            errors.push('Choose a schedule date before saving a scheduled post.');
        }
        if (errors.length) {
            throw new Error(errors.join(' '));
        }
    }

    async save({ publish = false, silent = false, autosave = false } = {}) {
        const payload = this.getPayload();
        if (publish) {
            payload.status = 'published';
            payload.published = true;
            setIfPresent(getField(this.root, '#postStatus'), 'published');
        }
        this.validatePayload(payload, { publish });

        const saveButtons = Array.from(this.root.querySelectorAll('[data-save-post]'));
        const publishButtons = Array.from(this.root.querySelectorAll('[data-publish-post]'));
        if (!silent) {
            this.setSaveStatus(autosave ? 'Autosaving...' : 'Saving...');
            saveButtons.forEach((button) => {
                button.disabled = true;
            });
            publishButtons.forEach((button) => {
                button.disabled = true;
            });
        }

        try {
            const response = payload.id
                ? await this.api('/api/admin/posts', { method: 'PATCH', body: JSON.stringify(payload) })
                : await this.api('/api/admin/posts', { method: 'POST', body: JSON.stringify(payload) });

            const post = response.post || {};
            if (post.id) {
                setIfPresent(getField(this.root, '#postId'), post.id);
                this.currentPost = post;
            }
            if (publish && !(post.published === true || post.status === 'published')) {
                throw new Error('Supabase saved the post, but did not mark it as published. Please try again.');
            }
            this.autosave.clear(payload.slug || payload.id || 'new');
            this.setSaveStatus(publish ? 'Refreshing published post...' : autosave ? 'Refreshing saved post...' : 'Refreshing saved post...');
            await this.onSaved(post);
            this.setSaveStatus(publish ? 'Published' : autosave ? 'Autosaved to Supabase' : 'Saved');
            if (!silent) {
                this.notify(publish ? 'Post published successfully.' : 'Post saved successfully.', 'success');
            }
            return post;
        } catch (error) {
            this.setSaveStatus(error.message || 'Save failed');
            if (!silent) this.notify(error.message || 'Save failed.', 'error');
            throw error;
        } finally {
            if (!silent) {
                saveButtons.forEach((button) => {
                    button.disabled = false;
                });
                publishButtons.forEach((button) => {
                    button.disabled = false;
                });
            }
        }
    }

    setSaveStatus(message) {
        this.root.querySelectorAll('[data-save-status]').forEach((status) => {
            status.textContent = message;
        });
    }

    setUploadProgress(percent, message) {
        const progress = getField(this.root, '[data-upload-progress]');
        if (!progress) return;
        const bar = progress.querySelector('span');
        progress.hidden = false;
        progress.setAttribute('aria-valuenow', String(Math.max(0, Math.min(100, percent || 0))));
        progress.setAttribute('aria-label', message || 'Uploading');
        if (bar) bar.style.width = `${Math.max(0, Math.min(100, percent || 0))}%`;
        if (message) this.setSaveStatus(message);
    }

    hideUploadProgress() {
        const progress = getField(this.root, '[data-upload-progress]');
        if (!progress) return;
        progress.hidden = true;
        const bar = progress.querySelector('span');
        if (bar) bar.style.width = '0%';
    }
}
