import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Lightweight health / keep-alive endpoint.
 * Hit periodically (e.g. cron every few days) to reduce Supabase free-tier pause impact.
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return NextResponse.json(
      { ok: false, error: "Missing Supabase environment variables" },
      { status: 503 }
    );
  }

  const started = Date.now();

  try {
    const supabase = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { error } = await supabase.from("categories").select("id").limit(1);

    // A missing table still proves the project is awake.
    const awake = !error || !/Failed to fetch|fetch failed|ENOTFOUND|ECONNREFUSED/i.test(error.message);

    return NextResponse.json({
      ok: awake,
      service: "aetherpress",
      latencyMs: Date.now() - started,
      supabase: awake ? "reachable" : "unreachable",
      detail: error?.message || null,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        service: "aetherpress",
        latencyMs: Date.now() - started,
        supabase: "unreachable",
        detail: err instanceof Error ? err.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
