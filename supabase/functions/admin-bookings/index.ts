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
      const status = url.searchParams.get("status");
      let query = supabase.from("bookings").select("*").order("booked_at", { ascending: false });
      if (status && status !== "all") {
        query = query.eq("payment_status", status);
      }
      const { data, error } = await query;
      if (error) throw error;
      return jsonResponse({ bookings: data ?? [] });
    }

    if (req.method === "PATCH") {
      const body = await req.json().catch(() => ({}));
      const { id, payment_status } = body;
      if (!id) return jsonResponse({ error: "Booking id required." }, 400);
      const { data, error } = await supabase
        .from("bookings")
        .update({ payment_status: payment_status || "confirmed" })
        .eq("id", id)
        .select()
        .single();
      if (error) return jsonResponse({ error: error.message }, 400);
      return jsonResponse({ booking: data });
    }

    return jsonResponse({ error: "Method not allowed" }, 405);
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Bookings API error." },
      500,
    );
  }
});
