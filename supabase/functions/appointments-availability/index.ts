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

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeSettings(row: Record<string, unknown> | null) {
  if (!row) {
    return {
      bookingEnabled: false,
      priceCents: 0,
      currency: "KES",
      availableDays: [],
      timeSlots: {},
      timezone: "UTC",
    };
  }

  return {
    bookingEnabled: Boolean(row.booking_enabled ?? row.bookingEnabled),
    priceCents: Number(row.price_cents ?? row.priceCents ?? 0),
    currency: String(row.currency ?? "KES"),
    availableDays: Array.isArray(row.available_days)
      ? (row.available_days as string[])
      : Array.isArray(row.availableDays)
      ? (row.availableDays as string[])
      : [],
    timeSlots:
      (row.time_slots as Record<string, string[]>) ||
      (row.timeSlots as Record<string, string[]>) ||
      {},
    timezone: String(row.timezone ?? "UTC"),
  };
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
  const start = url.searchParams.get("start") || toDateKey(new Date());
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 30);
  const end = url.searchParams.get("end") || toDateKey(endDate);

  const { data: settingsRow, error: settingsError } = await supabase
    .from("appointment_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (settingsError) {
    return jsonResponse({ error: "Unable to load Charla settings." }, 500);
  }

  const { data: blackoutsRows, error: blackoutsError } = await supabase
    .from("appointment_blackouts")
    .select("date")
    .order("date", { ascending: true });

  if (blackoutsError) {
    return jsonResponse({ error: "Unable to load blackout dates." }, 500);
  }

  const nowIso = new Date().toISOString();
  const { data: bookingsRows, error: bookingsError } = await supabase
    .from("appointment_bookings")
    .select("id,date,time,status,hold_expires_at")
    .gte("date", start)
    .lte("date", end)
    .or(`status.eq.confirmed,and(status.eq.pending,hold_expires_at.gt.${nowIso})`);

  if (bookingsError) {
    return jsonResponse({ error: "Unable to load bookings." }, 500);
  }

  const bookings = (bookingsRows || []).map((booking) => ({
    date: booking.date,
    time: booking.time,
    status: booking.status,
  }));

  const blackouts = (blackoutsRows || [])
    .map((row) => String((row as { date?: string }).date || ""))
    .filter(Boolean);

  return jsonResponse({
    settings: normalizeSettings(settingsRow as Record<string, unknown> | null),
    blackouts,
    bookings,
  });
});
