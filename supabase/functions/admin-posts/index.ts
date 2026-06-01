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
      const row = {
        title: body.title,
        slug,
        category: body.category || "Mental Health",
        content: body.content || "",
        excerpt: body.excerpt || body.summary || "",
        summary: body.excerpt || body.summary || "",
        emoji: body.emoji || "💜",
        published: Boolean(body.published),
        status: body.published ? "published" : "draft",
        url: `https://bloomly.co.ke/blog-post/?slug=${encodeURIComponent(slug)}`,
      };
      const { data, error } = await supabase.from("posts").insert(row).select().single();
      if (error) return jsonResponse({ error: error.message }, 400);
      return jsonResponse({ post: data });
    }

    if (req.method === "PATCH") {
      const id = body.id;
      if (!id) return jsonResponse({ error: "Post id required." }, 400);
      const updates = { ...body };
      delete updates.id;
      if (updates.published !== undefined) {
        updates.status = updates.published ? "published" : "draft";
      }
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
