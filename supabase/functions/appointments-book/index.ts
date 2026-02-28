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
const HOLD_MINUTES = 30;

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

function isValidDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidTime(value: string) {
  return /^\d{2}:\d{2}$/.test(value);
}

function getDayKey(dateValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const dayIndex = date.getDay();
  return ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][dayIndex];
}

function normalizeSettings(row: Record<string, unknown> | null) {
  if (!row) {
    return {
      bookingEnabled: false,
      priceCents: 0,
      currency: "KES",
      availableDays: [],
      timeSlots: {},
    };
  }
  return {
    bookingEnabled: Boolean(row.booking_enabled ?? row.bookingEnabled),
    priceCents: Number(row.price_cents ?? row.priceCents ?? 0),
    currency: String(row.currency ?? "KES"),
    availableDays: Array.isArray(row.available_days)
      ? (row.available_days as string[])
      : [],
    timeSlots: (row.time_slots as Record<string, string[]>) || {},
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse({ error: "Supabase service role key is missing." }, 500);
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON payload." }, 400);
  }

  const booking = {
    name: String(payload.name || "").trim(),
    email: String(payload.email || "").trim().toLowerCase(),
    purpose: String(payload.purpose || "").trim(),
    date: String(payload.date || "").trim(),
    time: String(payload.time || "").trim(),
  };

  if (!booking.name || !booking.email || !booking.purpose) {
    return jsonResponse({ error: "Name, email, and purpose are required." }, 400);
  }
  if (!isValidDate(booking.date) || !isValidTime(booking.time)) {
    return jsonResponse({ error: "Invalid date or time." }, 400);
  }

  const { data: settingsRow, error: settingsError } = await supabase
    .from("appointment_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  if (settingsError) {
    return jsonResponse({ error: "Unable to load Charla settings." }, 500);
  }
  const settings = normalizeSettings(settingsRow as Record<string, unknown> | null);

  const { data: blackoutsRows, error: blackoutsError } = await supabase
    .from("appointment_blackouts")
    .select("date");
  if (blackoutsError) {
    return jsonResponse({ error: "Unable to load blackout dates." }, 500);
  }
  const blackouts = new Set(
    (blackoutsRows || [])
      .map((row) => String((row as { date?: string }).date || ""))
      .filter(Boolean),
  );

  if (!settings.bookingEnabled) {
    return jsonResponse({ error: "Charla sessions are currently closed." }, 400);
  }
  if (!settings.priceCents || settings.priceCents <= 0) {
    return jsonResponse({ error: "Charla pricing is not configured." }, 400);
  }

  const dayKey = getDayKey(booking.date);
  const allowedSlots = settings.timeSlots?.[dayKey] || [];
  if (!settings.availableDays.includes(dayKey)) {
    return jsonResponse({ error: "Selected date is not available." }, 400);
  }
  if (!allowedSlots.includes(booking.time)) {
    return jsonResponse({ error: "Selected time is not available." }, 400);
  }
  if (blackouts.has(booking.date)) {
    return jsonResponse({ error: "Selected date is unavailable." }, 400);
  }

  const dateParts = booking.date.split("-").map(Number);
  const timeParts = booking.time.split(":").map(Number);
  const bookingDate = new Date(
    dateParts[0],
    dateParts[1] - 1,
    dateParts[2],
    timeParts[0],
    timeParts[1],
  );
  if (bookingDate < new Date()) {
    return jsonResponse({ error: "Selected time has already passed." }, 400);
  }

  const nowIso = new Date().toISOString();
  const { data: conflicts, error: conflictError } = await supabase
    .from("appointment_bookings")
    .select("id")
    .eq("date", booking.date)
    .eq("time", booking.time)
    .or(`status.eq.confirmed,and(status.eq.pending,hold_expires_at.gt.${nowIso})`);

  if (conflictError) {
    return jsonResponse({ error: "Unable to verify availability." }, 500);
  }
  if ((conflicts || []).length) {
    return jsonResponse(
      { error: "That slot has just been booked. Please choose another." },
      409,
    );
  }

  const holdExpiresAt = new Date(Date.now() + HOLD_MINUTES * 60 * 1000).toISOString();
  const { data: insertedRows, error: insertError } = await supabase
    .from("appointment_bookings")
    .insert({
      name: booking.name,
      email: booking.email,
      purpose: booking.purpose,
      date: booking.date,
      time: booking.time,
      status: "pending",
      amount_cents: settings.priceCents,
      currency: settings.currency,
      hold_expires_at: holdExpiresAt,
      created_at: new Date().toISOString(),
    })
    .select("*");

  if (insertError || !insertedRows?.length) {
    return jsonResponse({ error: "Unable to reserve booking." }, 500);
  }
  const bookingRow = insertedRows[0];

  return jsonResponse({
    booking: bookingRow,
    paymentRequired: true,
    paymentUrl: `${SITE_URL}/appointments/pay?booking_id=${encodeURIComponent(
      bookingRow.id,
    )}`,
    amountCents: settings.priceCents,
    currency: settings.currency,
  });
});
