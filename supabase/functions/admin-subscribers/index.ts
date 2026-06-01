import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse, verifyGitHubAdmin } from "../_shared/github-admin.ts";

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
      let { data, error } = await supabase
        .from("subscribers")
        .select("*")
        .order("subscribed_at", { ascending: false });

      if (error) {
        const fallback = await supabase
          .from("subscribers")
          .select("*")
          .order("created_at", { ascending: false });
        data = fallback.data;
        error = fallback.error;
      }

      if (error) {
        const plain = await supabase.from("subscribers").select("*");
        data = plain.data;
        error = plain.error;
      }

      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse({ subscribers: data ?? [] });
    }

    if (req.method === "DELETE") {
      const body = await req.json().catch(() => ({}));
      const id = url.searchParams.get("id") || body.id;
      if (!id) return jsonResponse({ error: "Subscriber id required." }, 400);
      const { error } = await supabase.from("subscribers").delete().eq("id", id);
      if (error) return jsonResponse({ error: error.message }, 400);
      return jsonResponse({ ok: true });
    }

    return jsonResponse({ error: "Method not allowed" }, 405);
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Subscribers API error." },
      500,
    );
  }
});
