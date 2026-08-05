/**
 * Vercel sometimes looks for routes-manifest.json at the project root when the
 * dashboard "Output Directory" is overridden to "." (instead of .next).
 * Static export already wrote it under .next/ — copy it as a compatibility shim.
 */
const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "..", ".next", "routes-manifest.json");
const dest = path.join(__dirname, "..", "routes-manifest.json");

if (!fs.existsSync(src)) {
  console.warn("vercel-postbuild: .next/routes-manifest.json not found; skipping copy");
  process.exit(0);
}

fs.copyFileSync(src, dest);
console.log("vercel-postbuild: copied .next/routes-manifest.json → ./routes-manifest.json");
