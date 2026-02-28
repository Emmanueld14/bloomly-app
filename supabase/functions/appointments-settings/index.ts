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

type DateOverride = {
  date: string;
  timeSlots: string[];
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

function normalizeDateOverrides(input: unknown): DateOverride[] {
  if (!Array.isArray(input)) return [];
  const byDate = new Map<string, DateOverride>();

  input.forEach((entry) => {
    const date = String((entry as { date?: string })?.date || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;

    const rawSlots = (entry as { timeSlots?: unknown; time_slots?: unknown })
      ?.timeSlots ?? (entry as { time_slots?: unknown })?.time_slots ?? [];
    const timeSlots = normalizeSlotList(rawSlots);
    if (!timeSlots.length) return;

    byDate.set(date, { date, timeSlots });
  });

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
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

function normalizeInput(input: Record<string, unknown>): SettingsPayload {
  const normalized = normalizeSettings(input);
  const safeSlots: Record<string, string[]> = {};
  for (const [day, values] of Object.entries(normalized.timeSlots || {})) {
    safeSlots[day] = normalizeSlotList(values);
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

  const { data: overridesRows, error: overridesError } = await supabase
    .from("appointment_date_overrides")
    .select("date,time_slots")
    .order("date", { ascending: true });
  if (overridesError) {
    throw new Error("Unable to load date overrides.");
  }

  return {
    settings: normalizeSettings(settingsRow as Record<string, unknown> | null),
    blackouts: (blackoutsRows || [])
      .map((row) => String((row as { date?: string }).date || ""))
      .filter(Boolean),
    dateOverrides: (overridesRows || [])
      .map((row) => ({
        date: String((row as { date?: string }).date || ""),
        timeSlots: normalizeSlotList((row as { time_slots?: unknown }).time_slots || []),
      }))
      .filter((row) => /^\d{4}-\d{2}-\d{2}$/.test(row.date)),
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
  const dateOverrides = normalizeDateOverrides(body.dateOverrides);

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

  const { error: deleteOverridesError } = await supabase
    .from("appointment_date_overrides")
    .delete()
    .gte("date", "1900-01-01");
  if (deleteOverridesError) {
    return jsonResponse({ error: "Unable to update date overrides." }, 500);
  }

  if (dateOverrides.length) {
    const rows = dateOverrides.map((entry) => ({
      date: entry.date,
      time_slots: entry.timeSlots,
    }));
    const { error: insertOverridesError } = await supabase
      .from("appointment_date_overrides")
      .insert(rows);
    if (insertOverridesError) {
      return jsonResponse({ error: "Unable to update date overrides." }, 500);
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
