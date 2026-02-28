import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse({ error: "Supabase service role key is missing." }, 500);
  }

  const url = new URL(req.url);
  const bookingId = String(url.searchParams.get("booking_id") || "").trim();
  if (!bookingId) {
    return jsonResponse({ error: "Missing booking_id." }, 400);
  }

  const { data: bookingRows, error: bookingError } = await supabase
    .from("appointment_bookings")
    .select("*")
    .eq("id", bookingId)
    .limit(1);

  if (bookingError) {
    return jsonResponse({ error: "Unable to load booking." }, 500);
  }

  const booking = bookingRows?.[0];
  if (!booking) {
    return jsonResponse({ error: "Booking not found." }, 404);
  }

  if (booking.status === "pending" && booking.hold_expires_at) {
    const holdExpiresAt = new Date(String(booking.hold_expires_at));
    if (!Number.isNaN(holdExpiresAt.getTime()) && holdExpiresAt < new Date()) {
      const { data: expiredRows } = await supabase
        .from("appointment_bookings")
        .update({ status: "expired" })
        .eq("id", bookingId)
        .select("*");
      if (expiredRows?.length) {
        booking.status = "expired";
      }
    }
  }

  const { data: attemptsRows, error: attemptsError } = await supabase
    .from("payment_attempts")
    .select("*")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: false });

  if (attemptsError) {
    return jsonResponse({ error: "Unable to load payment attempts." }, 500);
  }

  const latestAttempt = attemptsRows?.[0] || null;
  const paymentStatus =
    booking.status === "confirmed"
      ? "paid"
      : latestAttempt?.status || "pending";

  return jsonResponse({
    booking,
    paymentAttempts: attemptsRows || [],
    paymentStatus,
  });
});
