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
const MPESA_WEBHOOK_SECRET = Deno.env.get("MPESA_WEBHOOK_SECRET") || "";

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
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse({ error: "Supabase service role key is missing." }, 500);
  }

  const url = new URL(req.url);
  const incomingSecret = String(url.searchParams.get("secret") || "");
  if (MPESA_WEBHOOK_SECRET && incomingSecret !== MPESA_WEBHOOK_SECRET) {
    return jsonResponse({ error: "Unauthorized webhook call." }, 401);
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid payload." }, 400);
  }

  const stkCallback = (
    payload.Body as Record<string, unknown> | undefined
  )?.stkCallback as Record<string, unknown> | undefined;
  const checkoutRequestId = String(stkCallback?.CheckoutRequestID || "").trim();
  const resultCode = Number(stkCallback?.ResultCode ?? -1);

  if (!checkoutRequestId) {
    return jsonResponse({ error: "Missing CheckoutRequestID." }, 400);
  }

  const { data: attemptRows, error: attemptError } = await supabase
    .from("payment_attempts")
    .select("*")
    .eq("provider", "mpesa")
    .eq("external_reference", checkoutRequestId)
    .order("created_at", { ascending: false })
    .limit(1);
  if (attemptError) {
    return jsonResponse({ error: "Unable to load payment attempt." }, 500);
  }

  const attempt = attemptRows?.[0];
  if (!attempt) {
    return jsonResponse({ error: "No payment attempt found for callback." }, 404);
  }

  const succeeded = resultCode === 0;

  await supabase
    .from("payment_attempts")
    .update({
      status: succeeded ? "succeeded" : "failed",
      metadata: payload,
    })
    .eq("id", String(attempt.id));

  if (succeeded) {
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
