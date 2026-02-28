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
const PAYPAL_BASE_URL =
  Deno.env.get("PAYPAL_BASE_URL") || "https://api-m.sandbox.paypal.com";
const PAYPAL_CLIENT_ID = Deno.env.get("PAYPAL_CLIENT_ID") || "";
const PAYPAL_CLIENT_SECRET = Deno.env.get("PAYPAL_CLIENT_SECRET") || "";

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

async function createPayPalAccessToken() {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    throw new Error("PayPal credentials are missing.");
  }
  const auth = btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`);
  const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || "Unable to authenticate PayPal.");
  }
  return String(data.access_token);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse({ error: "Supabase service role key is missing." }, 500);
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON payload." }, 400);
  }

  const bookingId = String(body.bookingId || body.booking_id || "").trim();
  const orderId = String(body.orderId || body.order_id || "").trim();
  if (!bookingId || !orderId) {
    return jsonResponse({ error: "bookingId and orderId are required." }, 400);
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
    return jsonResponse({ booking, message: "Booking already confirmed." });
  }

  const { data: attemptRows, error: attemptError } = await supabase
    .from("payment_attempts")
    .select("*")
    .eq("booking_id", bookingId)
    .eq("provider", "paypal")
    .eq("external_reference", orderId)
    .order("created_at", { ascending: false })
    .limit(1);
  if (attemptError) {
    return jsonResponse({ error: "Unable to load payment attempt." }, 500);
  }
  const attempt = attemptRows?.[0];
  if (!attempt) {
    return jsonResponse({ error: "Payment attempt not found for PayPal order." }, 404);
  }

  try {
    const accessToken = await createPayPalAccessToken();
    const captureResponse = await fetch(
      `${PAYPAL_BASE_URL}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "PayPal-Request-Id": attempt.id,
        },
      },
    );
    const captureData = await captureResponse.json().catch(() => ({}));
    if (!captureResponse.ok) {
      await supabase
        .from("payment_attempts")
        .update({
          status: "failed",
          metadata: captureData,
        })
        .eq("id", attempt.id);
      return jsonResponse(
        { error: captureData?.message || "Unable to capture PayPal payment." },
        500,
      );
    }

    const status = String(captureData.status || "").toUpperCase();
    if (status !== "COMPLETED") {
      await supabase
        .from("payment_attempts")
        .update({
          status: "pending",
          metadata: captureData,
        })
        .eq("id", attempt.id);
      return jsonResponse(
        { error: `PayPal payment is ${status || "not completed"} yet.` },
        409,
      );
    }

    await supabase
      .from("payment_attempts")
      .update({
        status: "succeeded",
        metadata: captureData,
      })
      .eq("id", attempt.id);

    const { data: bookingUpdateRows, error: bookingUpdateError } = await supabase
      .from("appointment_bookings")
      .update({
        status: "confirmed",
        paid_at: new Date().toISOString(),
        hold_expires_at: null,
      })
      .eq("id", bookingId)
      .select("*");

    if (bookingUpdateError || !bookingUpdateRows?.length) {
      return jsonResponse({ error: "Payment captured but booking update failed." }, 500);
    }

    return jsonResponse({
      booking: bookingUpdateRows[0],
      paymentAttemptId: attempt.id,
      message: "Payment successful. Charla booking confirmed.",
    });
  } catch (error) {
    await supabase
      .from("payment_attempts")
      .update({
        status: "failed",
        metadata: {
          error: (error as Error).message || "PayPal capture failed.",
        },
      })
      .eq("id", attempt.id);
    return jsonResponse({ error: (error as Error).message || "PayPal capture failed." }, 500);
  }
});
