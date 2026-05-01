import { setCors } from './appointments-helpers.js';
import { prisma, toCommentResponse } from './db.js';

function getActor(req) {
    const body = req.body || {};
    const email = String(body.email || '').trim().toLowerCase();
    const name = String(body.name || '').trim();
    const avatar = String(body.avatar || '').trim();
    return {
        id: '',
        email,
        name: name || (email ? email.split('@')[0] : 'Bloomly Reader'),
        avatar
    };
}

async function ensureUser(actor) {
    if (!actor.id && !actor.email) {
        throw new Error('User identity is required.');
    }
    const email = actor.email || `${actor.id}@local.bloomly`;
    const existing = await prisma.user.findFirst({ where: { email } });
    if (existing) {
        return prisma.user.update({
            where: { id: existing.id },
            data: {
                name: actor.name,
                avatar: actor.avatar || null
            }
        });
    }
    return prisma.user.create({
        data: {
            email,
            name: actor.name,
            avatar: actor.avatar || null
        }
    });
}

async function ensurePost(slug, payload = {}) {
    const normalizedSlug = String(slug || payload.slug || '').trim();
    if (!normalizedSlug) {
        throw new Error('Post slug is required.');
    }
    const title = String(payload.title || normalizedSlug.replace(/-/g, ' ')).trim();
    const content = String(payload.content || '');
    const existing = await prisma.blogPost.findFirst({ where: { slug: normalizedSlug } });
    if (existing) {
        return prisma.blogPost.update({
            where: { id: existing.id },
            data: {
                title: title || normalizedSlug,
                content
            }
        });
    }
    return prisma.blogPost.create({
        data: {
            slug: normalizedSlug,
            title: title || normalizedSlug,
            content
        }
    });
}

function toRootComment(comment) {
    return {
        ...toCommentResponse(comment),
        replies: (comment.replies || []).map(toCommentResponse)
    };
}

async function listEngagement(req, res) {
    const slug = String(req.query.slug || '').trim();
    if (!slug) {
        return res.status(400).json({ error: 'Post slug is required.' });
    }

    const post = await prisma.blogPost.findFirst({
        where: { slug },
        include: {
            likes: true,
            comments: {
                where: { parentId: null },
                orderBy: { createdAt: 'asc' },
                include: {
                    user: true,
                    likes: true,
                    replies: {
                        orderBy: { createdAt: 'asc' },
                        include: { user: true, likes: true }
                    }
                }
            }
        }
    });

    if (!post) {
        return res.status(200).json({
            post: { slug, likeCount: 0, likedByUser: false },
            comments: []
        });
    }

    const email = String(req.query.email || '').trim().toLowerCase();
    const currentUser = email ? await prisma.user.findFirst({ where: { email } }) : null;
    const userId = currentUser?.id || String(req.query.userId || '').trim();
    return res.status(200).json({
        post: {
            id: post.id,
            slug: post.slug,
            likeCount: post.likes.length,
            likedByUser: userId ? post.likes.some((like) => like.userId === userId) : false
        },
        comments: post.comments.map((comment) => {
            const mapped = toRootComment(comment);
            mapped.likedByUser = userId ? comment.likes.some((like) => like.userId === userId) : false;
            mapped.replies = mapped.replies.map((reply) => ({
                ...reply,
                likedByUser: userId ? (comment.replies || [])
                    .find((candidate) => candidate.id === reply.id)
                    ?.likes?.some((like) => like.userId === userId) : false
            }));
            return mapped;
        })
    });
}

async function createComment(req, res) {
    const actor = getActor(req);
    const user = await ensureUser(actor);
    const post = await ensurePost(req.body?.slug, req.body?.post || {});
    const body = String(req.body?.body || '').trim();
    const parentId = String(req.body?.parentId || '').trim() || null;

    if (!body) {
        return res.status(400).json({ error: 'Comment body is required.' });
    }
    if (parentId) {
        const parent = await prisma.comment.findUnique({ where: { id: parentId } });
        if (!parent || parent.postId !== post.id || parent.parentId) {
            return res.status(400).json({ error: 'Replies can only be one level deep.' });
        }
    }

    const comment = await prisma.comment.create({
        data: {
            postId: post.id,
            userId: user.id,
            parentId,
            body
        },
        include: { user: true, likes: true }
    });
    return res.status(201).json({ user, comment: toCommentResponse(comment) });
}

async function updateComment(req, res) {
    const actor = getActor(req);
    const user = await ensureUser(actor);
    const id = String(req.body?.commentId || req.query.commentId || '').trim();
    const body = String(req.body?.body || '').trim();
    if (!id || !body) {
        return res.status(400).json({ error: 'Comment id and body are required.' });
    }
    const comment = await prisma.comment.findUnique({ where: { id }, include: { user: true, likes: true } });
    if (!comment || comment.userId !== user.id) {
        return res.status(403).json({ error: 'You can only edit your own comments.' });
    }
    const updated = await prisma.comment.update({
        where: { id },
        data: { body },
        include: { user: true, likes: true }
    });
    return res.status(200).json({ comment: toCommentResponse(updated) });
}

async function deleteComment(req, res) {
    const actor = getActor(req);
    const user = await ensureUser(actor);
    const id = String(req.body?.commentId || req.query.commentId || '').trim();
    if (!id) {
        return res.status(400).json({ error: 'Comment id is required.' });
    }
    const comment = await prisma.comment.findUnique({ where: { id } });
    if (!comment || comment.userId !== user.id) {
        return res.status(403).json({ error: 'You can only delete your own comments.' });
    }
    await prisma.comment.delete({ where: { id } });
    return res.status(200).json({ deleted: true });
}

async function toggleLike(req, res) {
    const actor = getActor(req);
    const user = await ensureUser(actor);
    const slug = String(req.body?.slug || '').trim();
    const commentId = String(req.body?.commentId || '').trim();

    let where;
    let createData;
    if (commentId) {
        const comment = await prisma.comment.findUnique({ where: { id: commentId } });
        if (!comment) {
            return res.status(404).json({ error: 'Comment not found.' });
        }
        where = { commentId, userId: user.id };
        createData = { commentId, userId: user.id };
    } else {
        const post = await ensurePost(slug, req.body?.post || {});
        where = { postId: post.id, userId: user.id };
        createData = { postId: post.id, userId: user.id };
    }

    const existing = await prisma.like.findFirst({ where });
    if (existing) {
        await prisma.like.delete({ where: { id: existing.id } });
    } else {
        await prisma.like.create({ data: createData });
    }

    const likeCount = commentId
        ? await prisma.like.count({ where: { commentId } })
        : await prisma.like.count({ where: { post: { slug } } });

    return res.status(200).json({ user, liked: !existing, likeCount });
}

export default async function handler(req, res) {
    setCors(res);
    if (req.method === 'OPTIONS') {
        return res.status(200).json({ message: 'OK' });
    }

    try {
        if (req.method === 'GET') return listEngagement(req, res);
        const action = String(req.body?.action || '').trim();
        if (req.method === 'POST' && action === 'comment') return createComment(req, res);
        if (req.method === 'PATCH' || action === 'edit-comment') return updateComment(req, res);
        if (req.method === 'DELETE' || action === 'delete-comment') return deleteComment(req, res);
        if (req.method === 'POST' && action === 'like') return toggleLike(req, res);
        return res.status(405).json({ error: 'Unsupported blog engagement action.' });
    } catch (error) {
        return res.status(500).json({ error: error.message || 'Unable to update blog engagement.' });
    }
}
