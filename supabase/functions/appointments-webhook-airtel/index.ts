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
const AIRTEL_WEBHOOK_SECRET = Deno.env.get("AIRTEL_WEBHOOK_SECRET") || "";

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

function readPath(
  payload: Record<string, unknown>,
  path: string[],
): unknown {
  let current: unknown = payload;
  for (const segment of path) {
    if (!current || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function firstString(payload: Record<string, unknown>, paths: string[][]) {
  for (const path of paths) {
    const value = readPath(payload, path);
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
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
  if (AIRTEL_WEBHOOK_SECRET && incomingSecret !== AIRTEL_WEBHOOK_SECRET) {
    return jsonResponse({ error: "Unauthorized webhook call." }, 401);
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid payload." }, 400);
  }

  const attemptReference = firstString(payload, [
    ["reference"],
    ["data", "reference"],
    ["transaction", "id"],
    ["data", "transaction", "id"],
  ]);

  if (!attemptReference) {
    return jsonResponse({ error: "Missing Airtel reference." }, 400);
  }

  const statusText = firstString(payload, [
    ["status", "code"],
    ["status"],
    ["transaction", "status"],
    ["data", "transaction", "status"],
    ["data", "status", "code"],
  ]).toUpperCase();

  const successStates = new Set(["TS", "SUCCESS", "SUCCESSFUL", "COMPLETED"]);
  const succeeded = successStates.has(statusText);

  let attempt: Record<string, unknown> | null = null;
  const { data: attemptByIdRows } = await supabase
    .from("payment_attempts")
    .select("*")
    .eq("provider", "airtel")
    .eq("id", attemptReference)
    .limit(1);
  attempt = attemptByIdRows?.[0] || null;

  if (!attempt) {
    const { data: attemptByExternalRows } = await supabase
      .from("payment_attempts")
      .select("*")
      .eq("provider", "airtel")
      .eq("external_reference", attemptReference)
      .order("created_at", { ascending: false })
      .limit(1);
    attempt = attemptByExternalRows?.[0] || null;
  }

  if (!attempt) {
    return jsonResponse({ error: "No payment attempt found for callback." }, 404);
  }

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
