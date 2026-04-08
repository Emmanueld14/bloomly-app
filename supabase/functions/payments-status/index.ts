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

  // For redirect-based providers (e.g. Pesapal), sync status lazily when users revisit.
  if (
    booking.status !== "confirmed" &&
    latestAttempt &&
    String(latestAttempt.provider || "").toLowerCase() === "pesapal"
  ) {
    const metadata = (latestAttempt.metadata as Record<string, unknown>) || {};
    const orderTrackingId = String(
      metadata.order_tracking_id || metadata.orderTrackingId || "",
    ).trim();
    const pesapalMerchantReference = String(
      metadata.pesapal_merchant_reference || metadata.merchantReference || "",
    ).trim();
    const checkoutRequestId = String(
      metadata.checkout_request_id || metadata.checkoutRequestId || "",
    ).trim();
    const shouldRefresh =
      latestAttempt.status === "pending" &&
      (orderTrackingId || pesapalMerchantReference || checkoutRequestId);

    if (shouldRefresh) {
      const PESAPAL_ENV = String(
        Deno.env.get("PESAPAL_ENV") || "sandbox",
      ).toLowerCase();
      const PESAPAL_BASE_URL =
        PESAPAL_ENV === "live"
          ? "https://pay.pesapal.com/v3"
          : "https://cybqa.pesapal.com/pesapalv3";
      const PESAPAL_CONSUMER_KEY = Deno.env.get("PESAPAL_CONSUMER_KEY") || "";
      const PESAPAL_CONSUMER_SECRET = Deno.env.get("PESAPAL_CONSUMER_SECRET") || "";
      const PESAPAL_IPN_ID = Deno.env.get("PESAPAL_IPN_ID") || "";

      if (PESAPAL_CONSUMER_KEY && PESAPAL_CONSUMER_SECRET && PESAPAL_IPN_ID) {
        try {
          const tokenResponse = await fetch(`${PESAPAL_BASE_URL}/api/Auth/RequestToken`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              consumer_key: PESAPAL_CONSUMER_KEY,
              consumer_secret: PESAPAL_CONSUMER_SECRET,
            }),
          });
          const tokenData = await tokenResponse.json().catch(() => ({}));
          const token = String(tokenData?.token || "").trim();

          if (token) {
            const query = new URLSearchParams({
              orderTrackingId: orderTrackingId || checkoutRequestId,
              pesapal_merchant_reference: pesapalMerchantReference || bookingId,
            });
            const statusResponse = await fetch(
              `${PESAPAL_BASE_URL}/api/Transactions/GetTransactionStatus?${query.toString()}`,
              {
                method: "GET",
                headers: {
                  Authorization: `Bearer ${token}`,
                  Accept: "application/json",
                  "Content-Type": "application/json",
                },
              },
            );
            const statusData = await statusResponse.json().catch(() => ({}));
            const paymentStatusDescription = String(
              statusData?.payment_status_description ||
                statusData?.status ||
                "",
            ).toUpperCase();
            const paymentStatusCode = Number(statusData?.payment_status_code ?? -1);
            const isPaid =
              paymentStatusCode === 1 ||
              paymentStatusDescription === "COMPLETED" ||
              paymentStatusDescription === "PAID";
            const isFailed =
              paymentStatusCode === 2 ||
              paymentStatusDescription === "FAILED" ||
              paymentStatusDescription === "INVALID";

            if (isPaid) {
              await supabase
                .from("payment_attempts")
                .update({
                  status: "succeeded",
                  metadata: {
                    ...metadata,
                    status_poll: statusData,
                    synced_at: new Date().toISOString(),
                  },
                })
                .eq("id", latestAttempt.id);

              const { data: refreshedBookingRows } = await supabase
                .from("appointment_bookings")
                .update({
                  status: "confirmed",
                  paid_at: new Date().toISOString(),
                  hold_expires_at: null,
                })
                .eq("id", bookingId)
                .select("*")
                .limit(1);

              if (refreshedBookingRows?.length) {
                Object.assign(booking, refreshedBookingRows[0]);
              }
            } else if (isFailed) {
              await supabase
                .from("payment_attempts")
                .update({
                  status: "failed",
                  metadata: {
                    ...metadata,
                    status_poll: statusData,
                    synced_at: new Date().toISOString(),
                  },
                })
                .eq("id", latestAttempt.id);
            }
          }
        } catch {
          // Non-fatal: keep legacy status response even if provider sync fails.
        }
      }
    }
  }
  const { data: refreshedAttemptsRows } = await supabase
    .from("payment_attempts")
    .select("*")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: false });

  const attempts = refreshedAttemptsRows || attemptsRows || [];
  const newestAttempt = attempts?.[0] || null;
  const paymentStatus =
    booking.status === "confirmed"
      ? "paid"
      : newestAttempt?.status || "pending";

  return jsonResponse({
    booking,
    paymentAttempts: attempts,
    paymentStatus,
  });
});
