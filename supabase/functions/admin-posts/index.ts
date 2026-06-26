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
      const { data, error } = await supabase.from("posts").insert(row).select().single();
      if (error) return jsonResponse({ error: error.message }, 400);
      return jsonResponse({ post: data });
    }

    if (req.method === "PATCH") {
      const id = body.id;
      if (!id) return jsonResponse({ error: "Post id required." }, 400);
      const slug = body.slug || slugify(body.title || "");
      const updates = normalizePostPayload(body, slug);
      const { data, error } = await supabase
        .from("posts")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) return jsonResponse({ error: error.message }, 400);
      return jsonResponse({ post: data });
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
