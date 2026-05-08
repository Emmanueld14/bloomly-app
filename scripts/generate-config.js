// scripts/generate-config.js
// Minimal config generator for Netlify build
// Bloomly is a static site using Netlify CMS with Git Gateway

const fs = require('fs');
const path = require('path');

// Ensure public directory exists
const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
}

// Generate minimal config file (for any future needs)
const config = {};

const configPath = path.join(publicDir, 'config.json');
fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

console.log('✅ public/config.json generated successfully');

const appointmentsConfigPath = path.join(__dirname, '..', 'appointments', 'config.js');
const appointmentsConfig = `window.APPOINTMENTS_PUBLIC_CONFIG = {
  apiBase: ${JSON.stringify(process.env.NEXT_PUBLIC_APPOINTMENTS_API_BASE || 'https://xmhyjttyarskimsxcfhl.supabase.co/functions/v1')},
  calendlyUrl: ${JSON.stringify(process.env.NEXT_PUBLIC_CALENDLY_URL || '')},
};
`;
fs.writeFileSync(appointmentsConfigPath, appointmentsConfig);
console.log('✅ appointments/config.js generated successfully');

