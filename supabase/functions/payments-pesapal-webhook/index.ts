import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const PESAPAL_WEBHOOK_SECRET = Deno.env.get("PESAPAL_WEBHOOK_SECRET") || "";

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

function normalizeStatus(value: string) {
  const status = String(value || "").trim().toUpperCase();
  if (["COMPLETED", "PAID", "SUCCESS", "SUCCEEDED"].includes(status)) {
    return { attempt: "succeeded", booking: "confirmed", paid: true };
  }
  if (["FAILED", "INVALID", "REVERSED", "CANCELLED", "CANCELED"].includes(status)) {
    return { attempt: "failed", booking: "pending", paid: false };
  }
  return { attempt: "pending", booking: "pending", paid: false };
}

async function loadAttemptByMerchantReference(reference: string) {
  const { data, error } = await supabase
    .from("payment_attempts")
    .select("*")
    .eq("provider", "pesapal")
    .eq("id", reference)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw new Error("Unable to load payment attempt.");
  return data?.[0] || null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse({ error: "Supabase service role key is missing." }, 500);
  }

  const url = new URL(req.url);
  const incomingSecret = String(url.searchParams.get("secret") || "");
  if (PESAPAL_WEBHOOK_SECRET && incomingSecret !== PESAPAL_WEBHOOK_SECRET) {
    return jsonResponse({ error: "Unauthorized webhook call." }, 401);
  }

  let payload: Record<string, unknown> = {};
  if (req.method === "POST") {
    try {
      payload = await req.json();
    } catch {
      payload = {};
    }
  }

  const orderTrackingId = String(
    payload.OrderTrackingId ||
      payload.orderTrackingId ||
      url.searchParams.get("OrderTrackingId") ||
      url.searchParams.get("orderTrackingId") ||
      "",
  ).trim();
  const merchantReference = String(
    payload.OrderMerchantReference ||
      payload.orderMerchantReference ||
      payload.merchant_reference ||
      url.searchParams.get("OrderMerchantReference") ||
      url.searchParams.get("merchantReference") ||
      "",
  ).trim();
  const paymentStatus = String(
    payload.PaymentStatusDescription ||
      payload.payment_status_description ||
      payload.status ||
      url.searchParams.get("PaymentStatusDescription") ||
      "",
  ).trim();

  if (!merchantReference) {
    return jsonResponse({ error: "Missing OrderMerchantReference." }, 400);
  }

  const attempt = await loadAttemptByMerchantReference(merchantReference);
  if (!attempt) {
    return jsonResponse({ error: "No payment attempt found for webhook." }, 404);
  }

  const normalized = normalizeStatus(paymentStatus);

  await supabase
    .from("payment_attempts")
    .update({
      status: normalized.attempt,
      external_reference: orderTrackingId || String(attempt.external_reference || ""),
      metadata: {
        ...(attempt.metadata || {}),
        pesapalWebhook: {
          receivedAt: new Date().toISOString(),
          paymentStatus,
          orderTrackingId,
          payload,
        },
      },
    })
    .eq("id", String(attempt.id));

  if (normalized.paid) {
    await supabase
      .from("appointment_bookings")
      .update({
        status: "confirmed",
        paid_at: new Date().toISOString(),
        hold_expires_at: null,
      })
      .eq("id", String(attempt.booking_id));
  }

  return jsonResponse({ ok: true });
});
