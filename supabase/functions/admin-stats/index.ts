import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse, verifyGitHubAdmin } from "../_shared/github-admin.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const auth = await verifyGitHubAdmin(req);
  if (!auth.ok) return jsonResponse({ error: auth.error }, auth.status);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    const [posts, subscribers, bookings, counsellors, recentBookings, recentSubscribers] =
      await Promise.all([
        supabase.from("posts").select("id", { count: "exact", head: true }),
        supabase.from("subscribers").select("id", { count: "exact", head: true }),
        supabase.from("bookings").select("id", { count: "exact", head: true }),
        supabase
          .from("counsellor_applications")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase.from("bookings").select("*").order("booked_at", { ascending: false }).limit(5),
        supabase.from("subscribers").select("*").order("created_at", { ascending: false }).limit(5),
      ]);

    return jsonResponse({
      counts: {
        posts: posts.count ?? 0,
        subscribers: subscribers.count ?? 0,
        bookings: bookings.count ?? 0,
        counsellorApplicationsPending: counsellors.count ?? 0,
      },
      recentBookings: recentBookings.data ?? [],
      recentSubscribers: recentSubscribers.data ?? [],
    });
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unable to load stats." },
      500,
    );
  }
});
