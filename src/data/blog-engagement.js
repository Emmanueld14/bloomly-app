/**
 * Blog comments and likes powered by Bloomly API endpoints.
 */
(function initBlogEngagement() {
    'use strict';

    const root = document.querySelector('[data-blog-engagement]');
    if (!root) return;

    const apiBase = '/api/blog-engagement';
    function resolvePostId() {
        const current = root.dataset.postId || document.querySelector('.post')?.dataset.postId || '';
        if (current) return current;
        if (window.BloomlyBlog?.resolveBlogSlug) return window.BloomlyBlog.resolveBlogSlug() || '';
        return new URLSearchParams(window.location.search).get('slug') || '';
    }

    const postId = resolvePostId();
    const storageKey = 'bloomly:engagement-user';
    const state = {
        postId,
        user: loadUser(),
        currentUserId: '',
        comments: [],
        postLikeCount: 0,
        likedPost: false,
        pollingId: null
    };

    const elements = {
        postLike: root.querySelector('[data-post-like]'),
        postLikeCount: root.querySelector('[data-post-like-count]'),
        commentsList: root.querySelector('[data-comments-list]'),
        commentsCount: root.querySelector('[data-comments-count]'),
        form: root.querySelector('[data-comment-form]'),
        name: root.querySelector('[data-comment-name]'),
        email: root.querySelector('[data-comment-email]'),
        body: root.querySelector('[data-comment-body]'),
        message: root.querySelector('[data-comments-message]')
    };

    function ensureMarkup() {
        if (elements.postLike && elements.commentsList && elements.form) return;
        root.innerHTML = `
            <div class="blog-engagement-card">
                <div class="blog-engagement-header">
                    <div>
                        <p class="blog-engagement-eyebrow">Join the conversation</p>
                        <h2>Reactions & comments</h2>
                    </div>
                    <button type="button" class="post-like-button" data-post-like aria-pressed="false">
                        <span class="post-like-heart">Heart</span>
                        <span><span data-post-like-count>0</span> likes</span>
                    </button>
                </div>
                <form class="comment-form" data-comment-form>
                    <div class="comment-form-grid">
                        <label>
                            <span>Name</span>
                            <input type="text" name="name" data-comment-name placeholder="Your name" required>
                        </label>
                        <label>
                            <span>Email</span>
                            <input type="email" name="email" data-comment-email placeholder="you@email.com" required>
                        </label>
                    </div>
                    <label>
                        <span>Comment</span>
                        <textarea name="body" data-comment-body rows="4" placeholder="Share a kind thought..." required></textarea>
                    </label>
                    <button type="submit" class="btn btn-primary">Post comment</button>
                    <p class="comments-message" data-comments-message aria-live="polite"></p>
                </form>
                <div class="comments-head">
                    <h3 data-comments-count>0 comments</h3>
                    <span>Updates refresh automatically.</span>
                </div>
                <div class="comments-list" data-comments-list></div>
            </div>
        `;
        elements.postLike = root.querySelector('[data-post-like]');
        elements.postLikeCount = root.querySelector('[data-post-like-count]');
        elements.commentsList = root.querySelector('[data-comments-list]');
        elements.commentsCount = root.querySelector('[data-comments-count]');
        elements.form = root.querySelector('[data-comment-form]');
        elements.name = root.querySelector('[data-comment-name]');
        elements.email = root.querySelector('[data-comment-email]');
        elements.body = root.querySelector('[data-comment-body]');
        elements.message = root.querySelector('[data-comments-message]');
    }

    ensureMarkup();

    function ensureMarkup() {
        if (root.querySelector('[data-comments-list]')) return;
        root.innerHTML = `
            <div class="blog-engagement-card">
                <div class="blog-engagement-header">
                    <div>
                        <p class="blog-engagement-eyebrow">Conversation</p>
                        <h2>Share your thoughts</h2>
                    </div>
                    <button type="button" class="blog-post-like-button" data-post-like aria-pressed="false">
                        <span aria-hidden="true">Heart</span>
                        <span><strong data-post-like-count>0</strong> likes</span>
                    </button>
                </div>
                <form class="comment-form" data-comment-form>
                    <div class="comment-form-row">
                        <input type="text" name="name" data-comment-name placeholder="Your name" required>
                        <input type="email" name="email" data-comment-email placeholder="you@email.com" required>
                    </div>
                    <textarea name="body" data-comment-body rows="4" placeholder="Add a kind comment..." required></textarea>
                    <button class="btn btn-primary" type="submit">Post comment</button>
                    <p class="comments-message" data-comments-message aria-live="polite"></p>
                </form>
                <div class="comments-panel">
                    <div class="comments-panel-head">
                        <h3 data-comments-count>0 comments</h3>
                        <span>Updates refresh automatically</span>
                    </div>
                    <div class="comments-list" data-comments-list></div>
                </div>
            </div>
        `;

        elements.postLike = root.querySelector('[data-post-like]');
        elements.postLikeCount = root.querySelector('[data-post-like-count]');
        elements.commentsList = root.querySelector('[data-comments-list]');
        elements.commentsCount = root.querySelector('[data-comments-count]');
        elements.form = root.querySelector('[data-comment-form]');
        elements.name = root.querySelector('[data-comment-name]');
        elements.email = root.querySelector('[data-comment-email]');
        elements.body = root.querySelector('[data-comment-body]');
        elements.message = root.querySelector('[data-comments-message]');
    }

    function loadUser() {
        try {
            const parsed = JSON.parse(window.localStorage.getItem(storageKey) || '{}');
            if (parsed && parsed.email) return parsed;
        } catch (error) {
            // Ignore corrupt local state.
        }
        return { id: '', name: '', email: '', avatar: '' };
    }

    function saveUser(user) {
        state.user = { ...state.user, ...user };
        if (user?.id) {
            state.currentUserId = user.id;
        }
        try {
            window.localStorage.setItem(storageKey, JSON.stringify(state.user));
        } catch (error) {
            // Non-critical.
        }
    }

    function setMessage(text, type) {
        if (!elements.message) return;
        elements.message.textContent = text || '';
        elements.message.classList.remove('is-error', 'is-success');
        if (type) elements.message.classList.add(`is-${type}`);
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function formatTimestamp(value) {
        try {
            return new Intl.DateTimeFormat(undefined, {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
            }).format(new Date(value));
        } catch (error) {
            return 'Just now';
        }
    }

    function getAvatar(comment) {
        if (comment.user?.avatar) {
            return `<img src="${escapeHtml(comment.user.avatar)}" alt="" loading="lazy">`;
        }
        const initial = escapeHtml((comment.user?.name || 'B').trim().charAt(0).toUpperCase() || 'B');
        return `<span>${initial}</span>`;
    }

    function canEdit(comment) {
        return Boolean(state.currentUserId && comment.user?.id && state.currentUserId === comment.user.id);
    }

    function buildComment(comment, isReply) {
        const replies = Array.isArray(comment.replies) ? comment.replies : [];
        const actions = canEdit(comment)
            ? `
                <button type="button" data-edit-comment="${comment.id}">Edit</button>
                <button type="button" data-delete-comment="${comment.id}">Delete</button>
            `
            : '';
        return `
            <article class="comment-card ${isReply ? 'comment-card--reply' : ''}" data-comment-id="${comment.id}">
                <div class="comment-avatar">${getAvatar(comment)}</div>
                <div class="comment-content">
                    <div class="comment-topline">
                        <strong>${escapeHtml(comment.user?.name || 'Bloomly reader')}</strong>
                        <span>${formatTimestamp(comment.createdAt)}</span>
                    </div>
                    <p class="comment-body">${escapeHtml(comment.body)}</p>
                    <div class="comment-actions">
                        <button type="button" class="comment-like-button ${comment.likedByCurrentUser ? 'is-liked' : ''}" data-like-comment="${comment.id}">
                            Heart <span>${Number(comment.likeCount || 0)}</span>
                        </button>
                        ${isReply ? '' : `<button type="button" data-reply-comment="${comment.id}">Reply</button>`}
                        ${actions}
                    </div>
                    <div class="comment-reply-slot" data-reply-slot="${comment.id}"></div>
                    ${replies.length ? `<div class="comment-replies">${replies.map((reply) => buildComment(reply, true)).join('')}</div>` : ''}
                </div>
            </article>
        `;
    }

    function render() {
        if (!elements.form) {
            root.innerHTML = `
                <div class="blog-engagement-card">
                    <div class="blog-engagement-header">
                        <div>
                            <p class="blog-engagement-eyebrow">Bloomly community</p>
                            <h2>Join the conversation</h2>
                        </div>
                        <button type="button" class="blog-like-button" data-post-like aria-pressed="false">
                            <span class="blog-like-heart">Heart</span>
                            <span><span data-post-like-count>${state.postLikeCount || 0}</span> likes</span>
                        </button>
                    </div>
                    <form class="comment-form" data-comment-form>
                        <div class="comment-form-row">
                            <input type="text" name="name" data-comment-name placeholder="Your name" required>
                            <input type="email" name="email" data-comment-email placeholder="you@email.com" required>
                        </div>
                        <textarea name="body" data-comment-body rows="4" placeholder="Share a kind thought..." required></textarea>
                        <button class="btn btn-primary" type="submit">Post comment</button>
                    </form>
                    <p class="comments-message" data-comments-message aria-live="polite"></p>
                    <div class="comments-header">
                        <h3>Comments</h3>
                        <span data-comments-count>0 comments</span>
                    </div>
                    <div class="comments-list" data-comments-list></div>
                </div>
            `;
            elements.postLike = root.querySelector('[data-post-like]');
            elements.postLikeCount = root.querySelector('[data-post-like-count]');
            elements.commentsList = root.querySelector('[data-comments-list]');
            elements.commentsCount = root.querySelector('[data-comments-count]');
            elements.form = root.querySelector('[data-comment-form]');
            elements.name = root.querySelector('[data-comment-name]');
            elements.email = root.querySelector('[data-comment-email]');
            elements.body = root.querySelector('[data-comment-body]');
            elements.message = root.querySelector('[data-comments-message]');
            bindEvents();
            if (elements.name) elements.name.value = state.user.name || '';
            if (elements.email) elements.email.value = state.user.email || '';
        }
        if (elements.postLikeCount) {
            elements.postLikeCount.textContent = String(state.postLikeCount || 0);
        }
        if (elements.postLike) {
            elements.postLike.classList.toggle('is-liked', state.likedPost);
            elements.postLike.setAttribute('aria-pressed', state.likedPost ? 'true' : 'false');
        }
        if (elements.commentsCount) {
            const total = state.comments.reduce((count, comment) => count + 1 + (comment.replies?.length || 0), 0);
            elements.commentsCount.textContent = `${total} comment${total === 1 ? '' : 's'}`;
        }
        if (elements.commentsList) {
            elements.commentsList.innerHTML = state.comments.length
                ? state.comments.map((comment) => buildComment(comment, false)).join('')
                : '<div class="comment-empty">Be the first to share a kind thought.</div>';
        }
    }

    async function request(path = '', options = {}) {
        const url = `${apiBase}${path}`;
        const headers = {
            'Content-Type': 'application/json',
            ...(state.user?.id ? { 'X-Bloomly-User-Id': state.user.id } : {}),
            ...(options.headers || {})
        };
        const response = await fetch(url, { ...options, headers });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(payload.error || 'Something went wrong.');
        }
        return payload;
    }

    async function loadEngagement() {
        if (!state.postId) return;
        const payload = await request(`?slug=${encodeURIComponent(state.postId)}&userId=${encodeURIComponent(state.currentUserId || '')}`);
        state.comments = payload.comments || [];
        state.postLikeCount = payload.post?.likeCount || 0;
        state.likedPost = Boolean(payload.post?.likedByUser);
        render();
    }

    async function togglePostLike() {
        if (!state.postId) return;
        if (!state.user.name || !state.user.email) {
            fillUserFromForm();
        }
        if (!state.user.name || !state.user.email) {
            setMessage('Enter your name and email before liking.', 'error');
            return;
        }
        elements.postLike?.classList.add('is-popping');
        const payload = await request('', {
            method: 'POST',
            body: JSON.stringify({ action: 'like', slug: state.postId, ...state.user })
        });
        if (payload.user) saveUser(payload.user);
        state.postLikeCount = payload.likeCount || 0;
        state.likedPost = Boolean(payload.liked);
        render();
        setTimeout(() => elements.postLike?.classList.remove('is-popping'), 250);
    }

    function fillUserFromForm() {
        const user = {
            name: String(elements.name?.value || state.user.name || '').trim(),
            email: String(elements.email?.value || state.user.email || '').trim(),
            avatar: state.user.avatar || ''
        };
        if (user.name || user.email) saveUser(user);
        return user;
    }

    async function submitComment(event, parentId = null, form = elements.form) {
        event.preventDefault();
        if (!state.postId) return;
        if (parentId && (!state.user.name || !state.user.email)) {
            fillUserFromForm();
        }
        const bodyInput = form.querySelector('[name="body"]');
        const body = String(bodyInput?.value || '').trim();
        const user = parentId ? state.user : fillUserFromForm();
        if (!user.name || !user.email) {
            setMessage('Enter your name and email before commenting.', 'error');
            return;
        }
        if (!body) {
            setMessage('Write a comment before posting.', 'error');
            return;
        }
        const payload = await request('', {
            method: 'POST',
            body: JSON.stringify({ action: 'comment', slug: state.postId, parentId, body, ...user })
        });
        if (payload.user) saveUser(payload.user);
        setMessage(parentId ? 'Reply posted.' : 'Comment posted.', 'success');
        form.reset();
        if (elements.name) elements.name.value = state.user.name || '';
        if (elements.email) elements.email.value = state.user.email || '';
        await loadEngagement();
    }

    function showReplyForm(commentId) {
        const slot = root.querySelector(`[data-reply-slot="${commentId}"]`);
        if (!slot) return;
        slot.innerHTML = `
            <form class="comment-form comment-form--reply" data-inline-reply-form>
                <textarea name="body" rows="3" placeholder="Write a reply..." required></textarea>
                <div class="comment-inline-actions">
                    <button class="btn btn-primary" type="submit">Post reply</button>
                    <button class="btn btn-secondary" type="button" data-cancel-reply>Cancel</button>
                </div>
            </form>
        `;
        const form = slot.querySelector('form');
        form.addEventListener('submit', (event) => submitComment(event, commentId, form));
        slot.querySelector('[data-cancel-reply]').addEventListener('click', () => {
            slot.innerHTML = '';
        });
    }

    async function editComment(commentId) {
        const card = root.querySelector(`[data-comment-id="${commentId}"]`);
        const current = card?.querySelector('.comment-body')?.textContent || '';
        const next = window.prompt('Edit your comment', current);
        if (next === null) return;
        await request('', {
            method: 'PATCH',
            body: JSON.stringify({ action: 'edit-comment', commentId, body: next, ...state.user })
        });
        await loadEngagement();
    }

    async function deleteComment(commentId) {
        if (!window.confirm('Delete this comment?')) return;
        await request('', {
            method: 'POST',
            body: JSON.stringify({ action: 'delete-comment', commentId, ...state.user })
        });
        await loadEngagement();
    }

    async function toggleCommentLike(commentId, button) {
        if (!state.user.name || !state.user.email) {
            fillUserFromForm();
        }
        if (!state.user.name || !state.user.email) {
            setMessage('Enter your name and email before liking.', 'error');
            return;
        }
        button?.classList.add('is-popping');
        const payload = await request('', {
            method: 'POST',
            body: JSON.stringify({ action: 'like', slug: state.postId, commentId, ...state.user })
        });
        if (payload.user) saveUser(payload.user);
        if (payload.likeCount !== undefined) {
            const countNode = button?.querySelector('span');
            if (countNode) countNode.textContent = String(payload.likeCount);
        }
        await loadEngagement();
        setTimeout(() => button?.classList.remove('is-popping'), 250);
    }

    if (elements.name) elements.name.value = state.user.name || '';
    if (elements.email) elements.email.value = state.user.email || '';
    elements.form?.addEventListener('submit', (event) => submitComment(event));
    elements.postLike?.addEventListener('click', () => {
        togglePostLike().catch((error) => setMessage(error.message, 'error'));
    });
    root.addEventListener('click', (event) => {
        const replyButton = event.target.closest('[data-reply-comment]');
        const editButton = event.target.closest('[data-edit-comment]');
        const deleteButton = event.target.closest('[data-delete-comment]');
        const likeButton = event.target.closest('[data-like-comment]');
        if (replyButton) showReplyForm(replyButton.dataset.replyComment);
        if (editButton) editComment(editButton.dataset.editComment).catch((error) => setMessage(error.message, 'error'));
        if (deleteButton) deleteComment(deleteButton.dataset.deleteComment).catch((error) => setMessage(error.message, 'error'));
        if (likeButton) toggleCommentLike(likeButton.dataset.likeComment, likeButton).catch((error) => setMessage(error.message, 'error'));
    });

    loadEngagement().catch((error) => setMessage(error.message, 'error'));
    state.pollingId = window.setInterval(() => {
        loadEngagement().catch(() => {});
    }, 10000);
})();
