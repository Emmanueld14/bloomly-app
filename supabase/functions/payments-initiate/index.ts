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
const SITE_URL = Deno.env.get("SITE_URL") || "https://bloomly.co.ke";

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
const MPESA_WEBHOOK_SECRET = Deno.env.get("MPESA_WEBHOOK_SECRET") || "";
const MPESA_CALLBACK_URL =
  Deno.env.get("MPESA_CALLBACK_URL") ||
  `${SUPABASE_URL}/functions/v1/appointments-webhook-mpesa${
    MPESA_WEBHOOK_SECRET
      ? `?secret=${encodeURIComponent(MPESA_WEBHOOK_SECRET)}`
      : ""
  }`;

const AIRTEL_BASE_URL =
  Deno.env.get("AIRTEL_BASE_URL") || "https://openapiuat.airtel.africa";
const AIRTEL_CLIENT_ID = Deno.env.get("AIRTEL_CLIENT_ID") || "";
const AIRTEL_CLIENT_SECRET = Deno.env.get("AIRTEL_CLIENT_SECRET") || "";
const AIRTEL_COUNTRY = (Deno.env.get("AIRTEL_COUNTRY") || "KE").toUpperCase();
const AIRTEL_CURRENCY = (Deno.env.get("AIRTEL_CURRENCY") || "KES").toUpperCase();
const AIRTEL_WEBHOOK_SECRET = Deno.env.get("AIRTEL_WEBHOOK_SECRET") || "";
const AIRTEL_CALLBACK_URL =
  Deno.env.get("AIRTEL_CALLBACK_URL") ||
  `${SUPABASE_URL}/functions/v1/appointments-webhook-airtel${
    AIRTEL_WEBHOOK_SECRET
      ? `?secret=${encodeURIComponent(AIRTEL_WEBHOOK_SECRET)}`
      : ""
  }`;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

type PaymentProvider = "paypal" | "mpesa" | "airtel";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function normalizePhone(phone: string) {
  const digits = phone.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) {
    return digits.slice(1);
  }
  if (digits.startsWith("0")) {
    return `254${digits.slice(1)}`;
  }
  return digits;
}

function toMoney(amountCents: number) {
  return (Math.max(0, amountCents) / 100).toFixed(2);
}

function mpesaTimestamp(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  return `${y}${m}${d}${h}${min}${s}`;
}

async function updateAttempt(
  attemptId: string,
  patch: { status?: string; external_reference?: string; metadata?: Record<string, unknown> },
) {
  await supabase.from("payment_attempts").update(patch).eq("id", attemptId);
}

async function createPayPalAccessToken() {
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

async function initiatePayPalPayment(params: {
  booking: Record<string, unknown>;
  attemptId: string;
  amountCents: number;
  currency: string;
}) {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    throw new Error("PayPal credentials are missing.");
  }

  const bookingId = String(params.booking.id);
  const accessToken = await createPayPalAccessToken();
  const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": params.attemptId,
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: bookingId,
          amount: {
            currency_code: params.currency,
            value: toMoney(params.amountCents),
          },
        },
      ],
      application_context: {
        return_url: `${SITE_URL}/appointments/pay?booking_id=${encodeURIComponent(
          bookingId,
        )}&provider=paypal`,
        cancel_url: `${SITE_URL}/appointments/pay?booking_id=${encodeURIComponent(
          bookingId,
        )}&provider=paypal&cancelled=1`,
        user_action: "PAY_NOW",
        brand_name: "Bloomly",
      },
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || "Unable to create PayPal order.");
  }

  const approveLink = Array.isArray(data.links)
    ? data.links.find((link: Record<string, unknown>) => link.rel === "approve")
    : null;
  if (!approveLink?.href) {
    throw new Error("PayPal approval link missing.");
  }

  return {
    externalReference: String(data.id || ""),
    redirectUrl: String(approveLink.href),
    raw: data,
  };
}

async function createMpesaAccessToken() {
  const auth = btoa(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`);
  const response = await fetch(
    `${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
    {
      method: "GET",
      headers: {
        Authorization: `Basic ${auth}`,
      },
    },
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    throw new Error(data.errorMessage || "Unable to authenticate M-Pesa.");
  }
  return String(data.access_token);
}

async function initiateMpesaPayment(params: {
  booking: Record<string, unknown>;
  attemptId: string;
  amountCents: number;
  phone: string;
}) {
  if (
    !MPESA_CONSUMER_KEY || !MPESA_CONSUMER_SECRET || !MPESA_SHORTCODE ||
    !MPESA_PASSKEY
  ) {
    throw new Error("M-Pesa credentials are missing.");
  }

  const phone = normalizePhone(params.phone);
  if (!/^254\d{9}$/.test(phone)) {
    throw new Error("Enter a valid Kenyan phone number (e.g. 2547XXXXXXXX).");
  }

  const token = await createMpesaAccessToken();
  const timestamp = mpesaTimestamp();
  const password = btoa(`${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`);
  const amount = Math.max(1, Math.round(params.amountCents / 100));
  const bookingId = String(params.booking.id || "");

  const response = await fetch(
    `${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        BusinessShortCode: MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: amount,
        PartyA: phone,
        PartyB: MPESA_SHORTCODE,
        PhoneNumber: phone,
        CallBackURL: MPESA_CALLBACK_URL,
        AccountReference: bookingId.slice(0, 12),
        TransactionDesc: `Bloomly Charla ${bookingId.slice(0, 8)}`,
      }),
    },
  );
  const data = await response.json().catch(() => ({}));

  if (!response.ok || String(data.ResponseCode) !== "0") {
    throw new Error(
      data.errorMessage || data.ResponseDescription ||
        "Unable to start M-Pesa payment.",
    );
  }

  return {
    externalReference: String(data.CheckoutRequestID || ""),
    checkoutRequestId: String(data.CheckoutRequestID || ""),
    raw: data,
  };
}

async function createAirtelAccessToken() {
  const response = await fetch(`${AIRTEL_BASE_URL}/auth/oauth2/token`, {
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
  });
  const data = await response.json().catch(() => ({}));
  const token = data.access_token || data?.data?.access_token;
  if (!response.ok || !token) {
    throw new Error(
      data?.error_description || data?.message ||
        "Unable to authenticate Airtel Money.",
    );
  }
  return String(token);
}

async function initiateAirtelPayment(params: {
  attemptId: string;
  amountCents: number;
  currency: string;
  phone: string;
}) {
  if (!AIRTEL_CLIENT_ID || !AIRTEL_CLIENT_SECRET) {
    throw new Error("Airtel credentials are missing.");
  }
  const phone = normalizePhone(params.phone);
  if (!/^254\d{9}$/.test(phone)) {
    throw new Error("Enter a valid phone number for Airtel Money.");
  }

  const token = await createAirtelAccessToken();
  const amount = toMoney(params.amountCents);
  const response = await fetch(`${AIRTEL_BASE_URL}/merchant/v1/payments/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Country": AIRTEL_COUNTRY,
      "X-Currency": params.currency || AIRTEL_CURRENCY,
    },
    body: JSON.stringify({
      reference: params.attemptId,
      subscriber: {
        country: AIRTEL_COUNTRY,
        currency: params.currency || AIRTEL_CURRENCY,
        msisdn: phone,
      },
      transaction: {
        amount,
        country: AIRTEL_COUNTRY,
        currency: params.currency || AIRTEL_CURRENCY,
        id: params.attemptId,
      },
      callback_url: AIRTEL_CALLBACK_URL,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      data?.message || data?.status?.message ||
        "Unable to start Airtel payment.",
    );
  }

  const externalReference =
    data?.data?.transaction?.id || data?.data?.id || params.attemptId;
  return {
    externalReference: String(externalReference),
    raw: data,
  };
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
  const provider = String(body.provider || "").trim().toLowerCase() as PaymentProvider;
  const phone = String(body.phone || "").trim();
  if (!bookingId || !provider) {
    return jsonResponse({ error: "bookingId and provider are required." }, 400);
  }
  if (!["paypal", "mpesa", "airtel"].includes(provider)) {
    return jsonResponse({ error: "Unsupported payment provider." }, 400);
  }
  if ((provider === "mpesa" || provider === "airtel") && !phone) {
    return jsonResponse({ error: "Phone number is required." }, 400);
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

  if (booking.hold_expires_at && new Date(booking.hold_expires_at) < new Date()) {
    await supabase
      .from("appointment_bookings")
      .update({ status: "expired" })
      .eq("id", booking.id);
    return jsonResponse({ error: "This booking hold expired. Please rebook." }, 409);
  }

  const amountCents = Number(booking.amount_cents || 0);
  if (amountCents <= 0) {
    return jsonResponse({ error: "Booking amount is invalid." }, 400);
  }
  const currency = String(booking.currency || "KES").toUpperCase();

  const { data: attemptRows, error: attemptInsertError } = await supabase
    .from("payment_attempts")
    .insert({
      booking_id: booking.id,
      provider,
      amount_cents: amountCents,
      currency,
      status: "pending",
      metadata: {
        initiated_at: new Date().toISOString(),
      },
    })
    .select("*");

  if (attemptInsertError || !attemptRows?.length) {
    return jsonResponse({ error: "Unable to create payment attempt." }, 500);
  }

  const attempt = attemptRows[0];

  try {
    if (provider === "paypal") {
      const result = await initiatePayPalPayment({
        booking,
        attemptId: attempt.id,
        amountCents,
        currency,
      });

      await updateAttempt(attempt.id, {
        external_reference: result.externalReference,
        metadata: result.raw,
      });

      return jsonResponse({
        provider,
        paymentAttemptId: attempt.id,
        requiresRedirect: true,
        redirectUrl: result.redirectUrl,
      });
    }

    if (provider === "mpesa") {
      const result = await initiateMpesaPayment({
        booking,
        attemptId: attempt.id,
        amountCents,
        phone,
      });
      await updateAttempt(attempt.id, {
        external_reference: result.externalReference,
        metadata: result.raw,
      });
      return jsonResponse({
        provider,
        paymentAttemptId: attempt.id,
        pending: true,
        message: "M-Pesa prompt sent to phone.",
        checkoutRequestId: result.checkoutRequestId,
      });
    }

    const result = await initiateAirtelPayment({
      attemptId: attempt.id,
      amountCents,
      currency,
      phone,
    });
    await updateAttempt(attempt.id, {
      external_reference: result.externalReference,
      metadata: result.raw,
    });
    return jsonResponse({
      provider,
      paymentAttemptId: attempt.id,
      pending: true,
      message: "Airtel Money request sent.",
    });
  } catch (error) {
    await updateAttempt(attempt.id, {
      status: "failed",
      metadata: {
        error: (error as Error).message || "Payment initiation failed.",
      },
    });
    return jsonResponse(
      { error: (error as Error).message || "Payment initiation failed." },
      500,
    );
  }
});
