#!/usr/bin/env node
/**
 * Seed Supabase posts from content/blog/*.md
 * Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-blog-posts.js
 */

const fs = require('fs');
const path = require('path');

const BLOG_DIR = path.join(__dirname, '../content/blog');
const INDEX_FILE = path.join(BLOG_DIR, 'index.json');

function parseFrontmatter(markdown) {
  const match = markdown.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!match) return null;
  const meta = {};
  match[1].split('\n').forEach((line) => {
    const i = line.indexOf(':');
    if (i > 0) {
      const key = line.slice(0, i).trim();
      let val = line.slice(i + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      meta[key] = val;
    }
  });
  return { metadata: meta, body: match[2].trim() };
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
  const rows = [];

  for (const filename of index) {
    if (!filename.endsWith('.md')) continue;
    const slug = filename.replace(/\.md$/, '');
    const raw = fs.readFileSync(path.join(BLOG_DIR, filename), 'utf8');
    const parsed = parseFrontmatter(raw);
    if (!parsed) {
      console.warn('Skip (no frontmatter):', filename);
      continue;
    }
    const { metadata, body } = parsed;
    const title = metadata.title || slug;
    const summary = metadata.summary || body.slice(0, 160);
    rows.push({
      title,
      slug,
      summary,
      excerpt: summary,
      url: `https://bloomly.co.ke/blog-post/?slug=${encodeURIComponent(slug)}`,
      category: metadata.category || 'Mental Health',
      content: body,
      emoji: metadata.emoji || '💜',
      published: true,
      status: 'published',
      created_at: metadata.date || new Date().toISOString(),
    });
  }

  for (const row of rows) {
    const res = await fetch(`${url}/rest/v1/posts?slug=eq.${encodeURIComponent(row.slug)}`, {
      method: 'PATCH',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify(row),
    });
    if (!res.ok) {
      const insertRes = await fetch(`${url}/rest/v1/posts`, {
        method: 'POST',
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify(row),
      });
      if (!insertRes.ok) {
        const err = await insertRes.text();
        console.error('Failed', row.slug, err);
      } else {
        console.log('Inserted', row.slug);
      }
    } else {
      console.log('Updated', row.slug);
    }
  }
  console.log(`Done. Processed ${rows.length} posts.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
