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
console.log('ℹ️  Bloomly uses Netlify CMS with Git Gateway for content management');

