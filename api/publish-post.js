import { setCors, getEnvConfig, ensureConfig } from './appointments-helpers.js';
import { prisma } from './db.js';

export default async function handler(req, res) {
    setCors(res);
    if (req.method === 'OPTIONS') {
        return res.status(200).json({ message: 'OK' });
    }
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const config = getEnvConfig();
    const configError = ensureConfig(config, ['databaseUrl']);
    if (configError) {
        return res.status(500).json({ error: configError });
    }

    const post = req.body?.post || {};
    const slug = String(post.slug || '').trim();
    if (!slug) {
        return res.status(400).json({ error: 'Post slug is required.' });
    }

    try {
        const existing = await prisma.blogPost.findFirst({ where: { slug } });
        const data = {
            title: String(post.title || slug.replace(/-/g, ' ')),
            content: String(post.content || post.summary || '')
        };
        if (existing) {
            await prisma.blogPost.update({ where: { id: existing.id }, data });
        } else {
            await prisma.blogPost.create({ data: { ...data, slug } });
        }
        return res.status(200).json({ status: 'published' });
    } catch (error) {
        return res.status(500).json({ error: error.message || 'Unable to sync post.' });
    }
}
