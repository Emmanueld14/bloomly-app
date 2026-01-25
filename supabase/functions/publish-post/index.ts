import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const ADMIN_PUBLISH_KEY = Deno.env.get("ADMIN_PUBLISH_KEY") || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

type PostRecord = {
  title: string;
  summary?: string | null;
  url: string;
  slug: string;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

async function upsertPost(post: PostRecord) {
  const { data, error } = await supabase
    .from("posts")
    .upsert(
      {
        title: post.title,
        slug: post.slug,
        summary: post.summary || null,
        url: post.url,
      },
      { onConflict: "slug" },
    )
    .select("id, title, slug, summary, url")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  if (ADMIN_PUBLISH_KEY) {
    const providedKey = req.headers.get("x-admin-key") || "";
    if (providedKey !== ADMIN_PUBLISH_KEY) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse({ error: "Supabase service role key is missing." }, 500);
  }

  let post: PostRecord | null = null;
  try {
    const body = await req.json();
    post = body?.post ?? body;
  } catch (error) {
    return jsonResponse({ error: "Invalid JSON payload." }, 400);
  }

  const title = (post?.title || "").trim();
  const url = (post?.url || "").trim();
  const summary = (post?.summary || "").trim();
  const slug = (post?.slug || slugify(title)).trim();

  if (!title || !url) {
    return jsonResponse({ error: "Post title and URL are required." }, 400);
  }

  try {
    const result = await upsertPost({ title, summary, url, slug });
    return jsonResponse({ status: "ok", post: result });
  } catch (error) {
    console.error("publish-post error", error);
    return jsonResponse({ error: "Failed to publish post." }, 500);
  }
});
