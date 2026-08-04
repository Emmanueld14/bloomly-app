/**
 * Public Supabase config for the Bloomly/AetherPress static admin.
 * NEXT_PUBLIC_* values are preferred when set at build time; defaults keep
 * Cloudflare Pages deploys working even without dashboard env vars.
 * The anon key is a public client key (safe to ship in the browser).
 */
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "https://xmhyjttyarskimsxcfhl.supabase.co";

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtaHlqdHR5YXJza2ltc3hjZmhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNDA0MjMsImV4cCI6MjA4NDkxNjQyM30.FlKaDDdR7FebbrrYQ8yNfelpQAeO4KZfGeSZEMoRMW4";
