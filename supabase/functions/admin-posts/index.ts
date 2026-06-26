import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse, verifyGitHubAdmin } from "../_shared/github-admin.ts";

function slugify(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function normalizePostPayload(body: Record<string, unknown>, slug: string) {
  const status = String(body.status || (body.published ? "published" : "draft"));
  const normalizedStatus = ["draft", "published", "scheduled"].includes(status) ? status : "draft";
  const excerpt = String(body.excerpt || body.summary || "").trim();
  return {
    title: body.title,
    slug,
    category: body.category || "Mental Health",
    content: body.content || "",
    content_json: body.content_json || null,
    content_html: body.content_html || null,
    excerpt,
    summary: excerpt,
    emoji: body.emoji || "Bloomly",
    published: normalizedStatus === "published",
    status: normalizedStatus,
    cover_image_url: body.cover_image_url || null,
    tags: Array.isArray(body.tags) ? body.tags : [],
    seo_title: body.seo_title || body.title || null,
    meta_description: body.meta_description || excerpt || null,
    scheduled_at: normalizedStatus === "scheduled" ? body.scheduled_at || null : null,
    read_time_minutes: Math.max(1, Number(body.read_time_minutes || 1)),
    url: `https://bloomly.co.ke/blog-post/?slug=${encodeURIComponent(slug)}`,
  };
}

function validatePostPayload(
  row: ReturnType<typeof normalizePostPayload>,
  { publish = false }: { publish?: boolean } = {},
) {
  const errors: string[] = [];
  if (!row.title || !String(row.title).trim()) errors.push("Title is required.");
  if (!row.slug || !String(row.slug).trim()) errors.push("Slug is required.");
  if (publish) {
    const hasText = Boolean(String(row.content || "").trim());
    const hasImage = /<img\s/i.test(String(row.content_html || ""));
    if (!hasText && !hasImage) errors.push("Content is required before publishing.");
  }
  if (row.status === "scheduled" && !row.scheduled_at) {
    errors.push("Scheduled posts require a scheduled_at date.");
  }
  return errors.length ? errors.join(" ") : null;
}

async function verifyPersistedPost(
  supabase: any,
  id: unknown,
  expected: ReturnType<typeof normalizePostPayload>,
) {
  const { data, error } = await supabase.from("posts").select("*").eq("id", id).single();
  if (error || !data) {
    throw new Error(error?.message || "Post write could not be verified in Supabase.");
  }
  if (expected.published && !(data.published === true || data.status === "published")) {
    throw new Error("Post saved, but Supabase did not persist published=true/status=published.");
  }
  if (data.slug !== expected.slug) {
    throw new Error("Post saved with an unexpected slug. Please reload and try again.");
  }
  return data;
}

function postResponse(post: Record<string, unknown>, action: "created" | "updated") {
  const slug = String(post.slug || "");
  return jsonResponse({
    post,
    verified: true,
    action,
    published: post.published === true || post.status === "published",
    frontend: {
      blogUrl: `https://bloomly.co.ke/blog/?fresh=${Date.now()}`,
      postUrl: `https://bloomly.co.ke/blog-post/?slug=${encodeURIComponent(slug)}&fresh=${Date.now()}`,
    },
  });
}

function schemaErrorResponse(error: { message?: string } | null) {
  const message = error?.message || "";
  if (/content_(html|json).*schema cache|Could not find the 'content_(html|json)' column/i.test(message)) {
    return jsonResponse({
      error:
        `${message} Run the Supabase workflow or apply supabase/migrations/202606260001_blog_rich_editor_content.sql.`,
      schemaFixRequired: true,
      schemaFixHint:
        "Run GitHub Actions -> Supabase after the migration history repair, or apply supabase/migrations/202606260001_blog_rich_editor_content.sql in Supabase SQL Editor.",
    }, 400);
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const auth = await verifyGitHubAdmin(req);
  if (!auth.ok) return jsonResponse({ error: auth.error }, auth.status);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const url = new URL(req.url);

  try {
    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return jsonResponse({ posts: data ?? [] });
    }

    const body =
      req.method !== "DELETE" ? await req.json().catch(() => ({})) : {};

    if (req.method === "POST") {
      const slug = body.slug || slugify(body.title || "");
      const row = normalizePostPayload(body, slug);
      const validationError = validatePostPayload(row, { publish: row.published });
      if (validationError) return jsonResponse({ error: validationError }, 400);
      const { data, error } = await supabase.from("posts").insert(row).select().single();
      if (error) return schemaErrorResponse(error) || jsonResponse({ error: error.message }, 400);
      const verified = await verifyPersistedPost(supabase, data.id, row);
      return postResponse(verified, "created");
    }

    if (req.method === "PATCH") {
      const id = body.id;
      if (!id) return jsonResponse({ error: "Post id required." }, 400);
      const slug = body.slug || slugify(body.title || "");
      const updates = normalizePostPayload(body, slug);
      const validationError = validatePostPayload(updates, { publish: updates.published });
      if (validationError) return jsonResponse({ error: validationError }, 400);
      const { data, error } = await supabase
        .from("posts")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) return schemaErrorResponse(error) || jsonResponse({ error: error.message }, 400);
      const verified = await verifyPersistedPost(supabase, data.id || id, updates);
      return postResponse(verified, "updated");
    }

    if (req.method === "DELETE") {
      const id = url.searchParams.get("id") || body.id;
      if (!id) return jsonResponse({ error: "Post id required." }, 400);
      const { error } = await supabase.from("posts").delete().eq("id", id);
      if (error) return jsonResponse({ error: error.message }, 400);
      return jsonResponse({ ok: true });
    }

    return jsonResponse({ error: "Method not allowed" }, 405);
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Posts API error." },
      500,
    );
  }
});
