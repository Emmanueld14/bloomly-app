/**
 * Generate supabase-config.js from environment variables
 * This script runs during Netlify build to create the config file
 */

const fs = require('fs');
const path = require('path');

// Get environment variables (set in Netlify dashboard)
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

// Generate the config file content
const config = `// Auto-generated Supabase configuration
// This file is generated automatically during build
// DO NOT commit this file to version control

window.SUPABASE_URL = '${supabaseUrl}';
window.SUPABASE_ANON_KEY = '${supabaseAnonKey}';

`;

// Write to supabase-config.js in the root directory
const configPath = path.join(__dirname, '..', 'supabase-config.js');
fs.writeFileSync(configPath, config);

console.log('✅ Generated supabase-config.js');
console.log(`   SUPABASE_URL: ${supabaseUrl ? 'Set' : 'Missing'}`);
console.log(`   SUPABASE_ANON_KEY: ${supabaseAnonKey ? 'Set' : 'Missing'}`);

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️  Warning: SUPABASE_URL or SUPABASE_ANON_KEY not set in environment variables');
    console.warn('   Make sure to set these in Netlify Dashboard → Site settings → Environment variables');
}

