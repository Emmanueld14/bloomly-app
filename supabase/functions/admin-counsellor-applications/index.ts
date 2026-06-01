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

  try {
    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("counsellor_applications")
        .select("*")
        .order("applied_at", { ascending: false });
      if (error) throw error;
      return jsonResponse({ applications: data ?? [] });
    }

    if (req.method === "PATCH") {
      const body = await req.json().catch(() => ({}));
      const { id, status } = body;
      if (!id || !status) return jsonResponse({ error: "Id and status required." }, 400);
      const { data, error } = await supabase
        .from("counsellor_applications")
        .update({ status })
        .eq("id", id)
        .select()
        .single();
      if (error) return jsonResponse({ error: error.message }, 400);
      return jsonResponse({ application: data });
    }

    return jsonResponse({ error: "Method not allowed" }, 405);
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Applications API error." },
      500,
    );
  }
});
