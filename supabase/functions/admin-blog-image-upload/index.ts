import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse, verifyGitHubAdmin } from "../_shared/github-admin.ts";

const BUCKET = "blog-images";
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

function extensionFor(file: File) {
  const byType: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
  };
  return byType[file.type] || file.name.split(".").pop()?.toLowerCase() || "jpg";
}

function buildObjectPath(file: File) {
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const safeName = file.name
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "image";
  return `${year}/${month}/${crypto.randomUUID()}-${safeName}.${extensionFor(file)}`;
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

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return jsonResponse({ error: "Image file is required." }, 400);
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return jsonResponse({ error: "Only JPG, PNG, GIF, and WebP images are allowed." }, 400);
    }
    if (file.size > MAX_BYTES) {
      return jsonResponse({ error: "Image is too large. Please keep uploads under 10 MB." }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const path = buildObjectPath(file);
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (error) {
      return jsonResponse({ error: error.message }, 400);
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return jsonResponse({
      bucket: BUCKET,
      path: `${BUCKET}/${path}`,
      objectPath: path,
      url: data.publicUrl,
    });
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Image upload failed." },
      500,
    );
  }
});
