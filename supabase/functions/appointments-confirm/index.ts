import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") || "";

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

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !STRIPE_SECRET_KEY) {
    return jsonResponse(
      { error: "Missing Supabase or Stripe configuration." },
      500,
    );
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON payload." }, 400);
  }

  const sessionId = String(payload.sessionId || "").trim();
  if (!sessionId) {
    return jsonResponse({ error: "Missing session id." }, 400);
  }

  const stripeResponse = await fetch(
    `https://api.stripe.com/v1/checkout/sessions/${sessionId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      },
    },
  );
  const stripeData = await stripeResponse.json().catch(() => ({}));

  if (!stripeResponse.ok) {
    return jsonResponse(
      { error: stripeData.error?.message || "Unable to verify payment session." },
      500,
    );
  }

  if (stripeData.payment_status !== "paid") {
    return jsonResponse({ error: "Payment not completed." }, 400);
  }

  const bookingId = stripeData.client_reference_id || stripeData.metadata?.booking_id;
  if (!bookingId) {
    return jsonResponse({ error: "Booking reference missing." }, 400);
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

  if (booking.status === "confirmed") {
    return jsonResponse({ booking });
  }

  const { data: conflicts, error: conflictError } = await supabase
    .from("appointment_bookings")
    .select("id")
    .eq("date", booking.date)
    .eq("time", booking.time)
    .eq("status", "confirmed")
    .neq("id", booking.id);

  if (conflictError) {
    return jsonResponse({ error: "Unable to verify slot." }, 500);
  }

  if ((conflicts || []).length) {
    await supabase
      .from("appointment_bookings")
      .update({ status: "conflict" })
      .eq("id", booking.id);
    return jsonResponse(
      { error: "This slot was already booked. Please contact support." },
      409,
    );
  }

  const { error: confirmError } = await supabase
    .from("appointment_bookings")
    .update({
      status: "confirmed",
      paid_at: new Date().toISOString(),
      stripe_payment_intent_id:
        stripeData.payment_intent || booking.stripe_payment_intent_id,
      hold_expires_at: null,
    })
    .eq("id", booking.id);

  if (confirmError) {
    return jsonResponse({ error: "Unable to confirm booking." }, 500);
  }

  const { data: refreshedRows } = await supabase
    .from("appointment_bookings")
    .select("*")
    .eq("id", booking.id)
    .limit(1);

  return jsonResponse({ booking: refreshedRows?.[0] || booking });
});
