#!/usr/bin/env node
/**
 * Builds the Next.js app (static export) and publishes AetherPress admin/auth
 * routes into the Cloudflare Pages site root so bloomly.co.ke/admin is the new CMS.
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const webDir = path.join(root, "web");
const outDir = path.join(webDir, "out");

// Defaults live in web/src/lib/supabase/config.ts as well (public anon key).
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "https://xmhyjttyarskimsxcfhl.supabase.co";
const supabaseAnon =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "";

console.log("Building AetherPress (static export) for /admin…");
console.log("Supabase URL:", supabaseUrl);
execSync("npm install", { cwd: webDir, stdio: "inherit" });
execSync("npm run build", {
  cwd: webDir,
  stdio: "inherit",
  env: {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    ...(supabaseAnon ? { NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnon } : {}),
  },
});

if (!fs.existsSync(outDir)) {
  throw new Error("web/out missing after Next.js export build");
}

function rmrf(target) {
  fs.rmSync(target, { recursive: true, force: true });
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

// Replace legacy admin + publish auth routes used by the new CMS
const publishMap = [
  ["admin", "admin"],
  ["login", "login"],
  ["signup", "signup"],
  ["account", "account"],
  ["_next", "_next"],
];

for (const [fromName, toName] of publishMap) {
  const from = path.join(outDir, fromName);
  const to = path.join(root, toName);
  if (!fs.existsSync(from)) {
    console.warn(`⚠️  Missing export path web/out/${fromName} — skipped`);
    continue;
  }
  rmrf(to);
  copyDir(from, to);
  console.log(`✅ Published /${toName} from AetherPress export`);
}

// Marker so we can tell which admin is live
fs.writeFileSync(
  path.join(root, "admin", "AETHERPRESS.txt"),
  "AetherPress admin published from web/ static export\n"
);

console.log("✅ AetherPress is now the site /admin");
