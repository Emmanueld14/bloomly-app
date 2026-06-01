import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse, verifyGitHubAdmin } from "../_shared/github-admin.ts";

const SITE_ORIGIN = "https://bloomly.co.ke";

function parseFrontmatter(markdown: string) {
  const match = markdown.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!match) return null;
  const metadata: Record<string, string> = {};
  match[1].split("\n").forEach((line) => {
    const i = line.indexOf(":");
    if (i <= 0) return;
    const key = line.slice(0, i).trim();
    let val = line.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    metadata[key] = val;
  });
  return { metadata, body: match[2].trim() };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const auth = await verifyGitHubAdmin(req);
  if (!auth.ok) return jsonResponse({ error: auth.error }, auth.status);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    const manifest = await fetch(`${SITE_ORIGIN}/content/blog/manifest.json`).then((r) =>
      r.json()
    );
    if (!Array.isArray(manifest)) {
      return jsonResponse({ error: "Invalid manifest" }, 500);
    }

    let synced = 0;
    const errors: string[] = [];

    for (const entry of manifest) {
      const slug = entry.slug;
      if (!slug) continue;
      const md = await fetch(`${SITE_ORIGIN}/content/blog/${slug}.md`);
      if (!md.ok) {
        errors.push(`${slug}: markdown missing`);
        continue;
      }
      const parsed = parseFrontmatter(await md.text());
      if (!parsed) {
        errors.push(`${slug}: bad frontmatter`);
        continue;
      }
      const { metadata, body } = parsed;
      const summary = metadata.summary || body.slice(0, 200);
      const published = String(metadata.published || "true").toLowerCase() !== "false";
      const row = {
        title: metadata.title || slug,
        slug,
        category: metadata.category || "Mental Health",
        content: body,
        excerpt: summary,
        summary,
        emoji: metadata.emoji || "💜",
        published,
        status: published ? "published" : "draft",
        url: `https://bloomly.co.ke/blog-post/?slug=${encodeURIComponent(slug)}`,
      };

      const { data: existing } = await supabase.from("posts").select("id").eq("slug", slug).maybeSingle();
      if (existing?.id) {
        const { error } = await supabase.from("posts").update(row).eq("id", existing.id);
        if (error) errors.push(`${slug}: ${error.message}`);
        else synced += 1;
      } else {
        const { error } = await supabase.from("posts").insert(row);
        if (error) errors.push(`${slug}: ${error.message}`);
        else synced += 1;
      }
    }

    const schemaMissing = errors.some((e) =>
      /category.*schema cache|Could not find the 'category' column/i.test(e),
    );

    return jsonResponse({
      ok: synced > 0 || errors.length === 0,
      synced,
      total: manifest.length,
      errors,
      ...(schemaMissing
        ? {
            schemaFixRequired: true,
            schemaFixHint:
              "Run supabase/migrations/202606010001_ensure_posts_cms_columns.sql in the Supabase SQL Editor (or supabase db push), then import again.",
          }
        : {}),
    });
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Sync failed" },
      500,
    );
  }
});
