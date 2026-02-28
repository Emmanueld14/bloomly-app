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

function normalizeTimeSlot(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const compact = raw.replace(/\s+/g, "");
  const noColonDigits = compact.replace(/[^\d]/g, "");
  if (!compact.includes(":") && /^\d{3,4}$/.test(noColonDigits)) {
    const padded = noColonDigits.padStart(4, "0");
    const hours = Number(padded.slice(0, 2));
    const minutes = Number(padded.slice(2));
    if (hours <= 23 && minutes <= 59) {
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    }
  }

  const parts = compact.split(":");
  if (parts.length !== 2) return "";
  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return "";
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return "";
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function normalizeSlotList(values: unknown) {
  const source = Array.isArray(values)
    ? values
    : String(values || "")
      .split(",")
      .map((entry) => String(entry || "").trim());
  const normalized = source
    .map((slot) => normalizeTimeSlot(slot))
    .filter(Boolean);
  return [...new Set(normalized)].sort();
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

  const rawTimeSlots =
    (row.time_slots as Record<string, unknown>) ||
    (row.timeSlots as Record<string, unknown>) ||
    {};
  const normalizedTimeSlots: Record<string, string[]> = {};
  for (const [day, values] of Object.entries(rawTimeSlots)) {
    normalizedTimeSlots[day] = normalizeSlotList(values);
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
    timeSlots: normalizedTimeSlots,
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

  const { data: overridesRows, error: overridesError } = await supabase
    .from("appointment_date_overrides")
    .select("date,time_slots")
    .order("date", { ascending: true });
  if (overridesError) {
    return jsonResponse({ error: "Unable to load date overrides." }, 500);
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
    time: normalizeTimeSlot(booking.time) || booking.time,
    status: booking.status,
  }));

  const blackouts = (blackoutsRows || [])
    .map((row) => String((row as { date?: string }).date || ""))
    .filter(Boolean);

  return jsonResponse({
    settings: normalizeSettings(settingsRow as Record<string, unknown> | null),
    blackouts,
    dateOverrides: (overridesRows || [])
      .map((row) => ({
        date: String((row as { date?: string }).date || ""),
        timeSlots: normalizeSlotList((row as { time_slots?: unknown }).time_slots || []),
      }))
      .filter((entry) => /^\d{4}-\d{2}-\d{2}$/.test(entry.date)),
    bookings,
  });
});
