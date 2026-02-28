import { Buffer } from "node:buffer";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const APPOINTMENTS_ADMIN_KEY =
  Deno.env.get("APPOINTMENTS_ADMIN_KEY") || "BloomlyCharla2026!";
const PAYPAL_BASE_URL =
  Deno.env.get("PAYPAL_BASE_URL") || "https://api-m.sandbox.paypal.com";
const PAYPAL_CLIENT_ID = Deno.env.get("PAYPAL_CLIENT_ID") || "";
const PAYPAL_CLIENT_SECRET = Deno.env.get("PAYPAL_CLIENT_SECRET") || "";
const MPESA_BASE_URL =
  Deno.env.get("MPESA_BASE_URL") || "https://sandbox.safaricom.co.ke";
const MPESA_CONSUMER_KEY = Deno.env.get("MPESA_CONSUMER_KEY") || "";
const MPESA_CONSUMER_SECRET = Deno.env.get("MPESA_CONSUMER_SECRET") || "";
const MPESA_SHORTCODE = Deno.env.get("MPESA_SHORTCODE") || "";
const MPESA_PASSKEY = Deno.env.get("MPESA_PASSKEY") || "";
const AIRTEL_BASE_URL =
  Deno.env.get("AIRTEL_BASE_URL") || "https://openapiuat.airtel.africa";
const AIRTEL_CLIENT_ID = Deno.env.get("AIRTEL_CLIENT_ID") || "";
const AIRTEL_CLIENT_SECRET = Deno.env.get("AIRTEL_CLIENT_SECRET") || "";
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") || "";

const LIVE_CHECK_TIMEOUT_MS = 10000;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function encodeBasicAuth(value: string) {
  if (typeof btoa === "function") {
    return btoa(value);
  }
  return Buffer.from(value).toString("base64");
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = LIVE_CHECK_TIMEOUT_MS,
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function parseResponseError(response: Response) {
  const text = await response.text().catch(() => "");
  if (!text) return `HTTP ${response.status}`;
  try {
    const payload = JSON.parse(text);
    return payload.error_description || payload.errorMessage || payload.message ||
      `HTTP ${response.status}`;
  } catch {
    return text.slice(0, 200);
  }
}

function buildProvider(
  configured: boolean,
  missing: string[],
  liveCheck: Record<string, unknown> | null = null,
  details: Record<string, unknown> = {},
) {
  const livePassed = !liveCheck || !liveCheck.attempted || liveCheck.ok;
  return {
    configured,
    ready: configured && livePassed,
    missing,
    liveCheck,
    ...details,
  };
}

async function runPaypalCheck() {
  const auth = encodeBasicAuth(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`);
  const response = await fetchWithTimeout(
    `${PAYPAL_BASE_URL}/v1/oauth2/token`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    },
  );
  if (!response.ok) {
    return { attempted: true, ok: false, detail: await parseResponseError(response) };
  }
  const data = await response.json().catch(() => ({}));
  if (!data.access_token) {
    return { attempted: true, ok: false, detail: "No access token returned." };
  }
  return { attempted: true, ok: true, detail: "OAuth token request succeeded." };
}

async function runMpesaCheck() {
  const auth = encodeBasicAuth(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`);
  const response = await fetchWithTimeout(
    `${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
    {
      method: "GET",
      headers: {
        Authorization: `Basic ${auth}`,
      },
    },
  );
  if (!response.ok) {
    return { attempted: true, ok: false, detail: await parseResponseError(response) };
  }
  const data = await response.json().catch(() => ({}));
  if (!data.access_token) {
    return { attempted: true, ok: false, detail: "No access token returned." };
  }
  return { attempted: true, ok: true, detail: "OAuth token request succeeded." };
}

async function runAirtelCheck() {
  const response = await fetchWithTimeout(
    `${AIRTEL_BASE_URL}/auth/oauth2/token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "*/*",
      },
      body: JSON.stringify({
        client_id: AIRTEL_CLIENT_ID,
        client_secret: AIRTEL_CLIENT_SECRET,
        grant_type: "client_credentials",
      }),
    },
  );
  if (!response.ok) {
    return { attempted: true, ok: false, detail: await parseResponseError(response) };
  }
  const data = await response.json().catch(() => ({}));
  const token = data.access_token || data?.data?.access_token;
  if (!token) {
    return { attempted: true, ok: false, detail: "No access token returned." };
  }
  return { attempted: true, ok: true, detail: "OAuth token request succeeded." };
}

function summarize(providers: Record<string, { ready: boolean }>) {
  const providerKeys = Object.keys(providers);
  const readyCount = providerKeys.filter((key) => providers[key].ready).length;
  return {
    providerCount: providerKeys.length,
    readyCount,
    notReadyProviders: providerKeys.filter((key) => !providers[key].ready),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const providedKey = req.headers.get("x-admin-key") || "";
  if (!providedKey || providedKey !== APPOINTMENTS_ADMIN_KEY) {
    return jsonResponse({ error: "Unauthorized." }, 401);
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const runLiveChecks = body?.runLiveChecks !== false;

  const stripeMissing: string[] = [];
  if (!STRIPE_SECRET_KEY) stripeMissing.push("STRIPE_SECRET_KEY");
  const stripeConfigured = stripeMissing.length === 0;
  const stripeMode = STRIPE_SECRET_KEY.startsWith("sk_live") ? "live" : "test";

  const paypalMissing: string[] = [];
  if (!PAYPAL_CLIENT_ID) paypalMissing.push("PAYPAL_CLIENT_ID");
  if (!PAYPAL_CLIENT_SECRET) paypalMissing.push("PAYPAL_CLIENT_SECRET");
  const paypalConfigured = paypalMissing.length === 0;

  const mpesaMissing: string[] = [];
  if (!MPESA_CONSUMER_KEY) mpesaMissing.push("MPESA_CONSUMER_KEY");
  if (!MPESA_CONSUMER_SECRET) mpesaMissing.push("MPESA_CONSUMER_SECRET");
  if (!MPESA_SHORTCODE) mpesaMissing.push("MPESA_SHORTCODE");
  if (!MPESA_PASSKEY) mpesaMissing.push("MPESA_PASSKEY");
  const mpesaConfigured = mpesaMissing.length === 0;

  const airtelMissing: string[] = [];
  if (!AIRTEL_CLIENT_ID) airtelMissing.push("AIRTEL_CLIENT_ID");
  if (!AIRTEL_CLIENT_SECRET) airtelMissing.push("AIRTEL_CLIENT_SECRET");
  const airtelConfigured = airtelMissing.length === 0;

  let paypalLiveCheck: Record<string, unknown> = {
    attempted: false,
    ok: false,
    detail: "Skipped.",
  };
  let mpesaLiveCheck: Record<string, unknown> = {
    attempted: false,
    ok: false,
    detail: "Skipped.",
  };
  let airtelLiveCheck: Record<string, unknown> = {
    attempted: false,
    ok: false,
    detail: "Skipped.",
  };

  if (runLiveChecks && paypalConfigured) {
    try {
      paypalLiveCheck = await runPaypalCheck();
    } catch (error) {
      paypalLiveCheck = {
        attempted: true,
        ok: false,
        detail: (error as Error).message || "PayPal check failed.",
      };
    }
  }
  if (runLiveChecks && mpesaConfigured) {
    try {
      mpesaLiveCheck = await runMpesaCheck();
    } catch (error) {
      mpesaLiveCheck = {
        attempted: true,
        ok: false,
        detail: (error as Error).message || "M-Pesa check failed.",
      };
    }
  }
  if (runLiveChecks && airtelConfigured) {
    try {
      airtelLiveCheck = await runAirtelCheck();
    } catch (error) {
      airtelLiveCheck = {
        attempted: true,
        ok: false,
        detail: (error as Error).message || "Airtel check failed.",
      };
    }
  }

  const providers = {
    stripe: buildProvider(
      stripeConfigured,
      stripeMissing,
      {
        attempted: false,
        ok: stripeConfigured,
        detail: stripeConfigured ? "Configured." : "Missing secret key.",
      },
      { mode: stripeConfigured ? stripeMode : null },
    ),
    paypal: buildProvider(
      paypalConfigured,
      paypalMissing,
      paypalLiveCheck,
      { baseUrl: PAYPAL_BASE_URL },
    ),
    mpesa: buildProvider(
      mpesaConfigured,
      mpesaMissing,
      mpesaLiveCheck,
      { baseUrl: MPESA_BASE_URL },
    ),
    airtel: buildProvider(
      airtelConfigured,
      airtelMissing,
      airtelLiveCheck,
      { baseUrl: AIRTEL_BASE_URL },
    ),
  };

  return jsonResponse({
    generatedAt: new Date().toISOString(),
    runLiveChecks,
    providers,
    summary: summarize(providers),
  });
});
