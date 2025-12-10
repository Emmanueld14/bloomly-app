// scripts/generate-config.js
// Minimal config generator for Netlify build
// Note: Bloomly website is static and doesn't require Supabase config

const fs = require('fs');
const path = require('path');

// Ensure public directory exists
const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
}

// Generate minimal config (empty since we don't use Supabase)
const config = {
    SUPABASE_URL: process.env.SUPABASE_URL || '',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || ''
};

const configPath = path.join(publicDir, 'config.json');
fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

console.log('✅ public/config.json generated successfully');
console.log('ℹ️  Note: Bloomly is a static site - config file is optional');

