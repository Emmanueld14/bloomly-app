import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-key",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const APPOINTMENTS_ADMIN_KEY =
  Deno.env.get("APPOINTMENTS_ADMIN_KEY") || "BloomlyCharla2026!";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

type SettingsPayload = {
  bookingEnabled: boolean;
  priceCents: number;
  currency: string;
  availableDays: string[];
  timeSlots: Record<string, string[]>;
  timezone: string;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function normalizeSettings(row: Record<string, unknown> | null): SettingsPayload {
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

function normalizeInput(input: Record<string, unknown>): SettingsPayload {
  const normalized = normalizeSettings(input);
  const safeSlots: Record<string, string[]> = {};
  for (const [day, values] of Object.entries(normalized.timeSlots || {})) {
    safeSlots[day] = Array.isArray(values)
      ? values.map((value) => String(value).trim()).filter(Boolean)
      : [];
  }

  return {
    ...normalized,
    priceCents: Math.max(0, Math.round(Number(normalized.priceCents || 0))),
    currency: String(normalized.currency || "KES").toUpperCase(),
    availableDays: Array.isArray(normalized.availableDays)
      ? normalized.availableDays.map((day) => String(day).trim()).filter(Boolean)
      : [],
    timeSlots: safeSlots,
    timezone: String(normalized.timezone || "UTC"),
  };
}

async function loadSettingsAndBlackouts() {
  const { data: settingsRow, error: settingsError } = await supabase
    .from("appointment_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (settingsError) {
    throw new Error("Unable to load Charla settings.");
  }

  const { data: blackoutsRows, error: blackoutsError } = await supabase
    .from("appointment_blackouts")
    .select("date")
    .order("date", { ascending: true });

  if (blackoutsError) {
    throw new Error("Unable to load blackout dates.");
  }

  return {
    settings: normalizeSettings(settingsRow as Record<string, unknown> | null),
    blackouts: (blackoutsRows || [])
      .map((row) => String((row as { date?: string }).date || ""))
      .filter(Boolean),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse({ error: "Supabase service role key is missing." }, 500);
  }

  if (req.method === "GET") {
    try {
      const payload = await loadSettingsAndBlackouts();
      return jsonResponse(payload);
    } catch (error) {
      return jsonResponse(
        { error: (error as Error).message || "Unable to load settings." },
        500,
      );
    }
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
    return jsonResponse({ error: "Invalid JSON payload." }, 400);
  }

  const normalized = normalizeInput(body);
  const blackoutDates = Array.isArray(body.blackouts)
    ? body.blackouts.map((value) => String(value).trim()).filter(Boolean)
    : [];

  const { error: settingsWriteError } = await supabase
    .from("appointment_settings")
    .upsert(
      {
        id: 1,
        booking_enabled: normalized.bookingEnabled,
        price_cents: normalized.priceCents,
        currency: normalized.currency,
        available_days: normalized.availableDays,
        time_slots: normalized.timeSlots,
        timezone: normalized.timezone,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

  if (settingsWriteError) {
    return jsonResponse({ error: "Unable to update settings." }, 500);
  }

  const { error: deleteBlackoutsError } = await supabase
    .from("appointment_blackouts")
    .delete()
    .gte("id", 0);

  if (deleteBlackoutsError) {
    return jsonResponse({ error: "Unable to update blackout dates." }, 500);
  }

  if (blackoutDates.length) {
    const rows = blackoutDates.map((date) => ({ date }));
    const { error: insertBlackoutsError } = await supabase
      .from("appointment_blackouts")
      .insert(rows);
    if (insertBlackoutsError) {
      return jsonResponse({ error: "Unable to update blackout dates." }, 500);
    }
  }

  try {
    const payload = await loadSettingsAndBlackouts();
    return jsonResponse(payload);
  } catch (error) {
    return jsonResponse(
      { error: (error as Error).message || "Unable to load updated settings." },
      500,
    );
  }
});
