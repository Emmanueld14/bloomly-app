#!/usr/bin/env node
/**
 * Generates a strong random admin password and sets Supabase Edge secrets:
 *   ADMIN_PUBLISH_KEY
 *   APPOINTMENTS_ADMIN_KEY
 * (same value for both — matches /admin/ unlock flow)
 *
 * Prerequisites:
 *   - Install CLI: https://supabase.com/docs/guides/cli
 *   - Run: supabase login
 *
 * Usage (from repo root):
 *   node scripts/set-supabase-admin-secrets.js
 *   npm run set-admin-secrets
 */

const { randomBytes } = require('crypto');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const configPath = path.join(root, 'supabase', 'config.toml');

function readProjectRef() {
    if (process.env.SUPABASE_PROJECT_REF) {
        return process.env.SUPABASE_PROJECT_REF.trim();
    }
    if (!fs.existsSync(configPath)) {
        return null;
    }
    const text = fs.readFileSync(configPath, 'utf8');
    const m = text.match(/project_id\s*=\s*"([^"]+)"/);
    return m ? m[1] : null;
}

const projectRef = readProjectRef();
if (!projectRef) {
    console.error('Could not read project_id from supabase/config.toml.');
    console.error('Set SUPABASE_PROJECT_REF or add project_id to supabase/config.toml');
    process.exit(1);
}

const secret = randomBytes(32).toString('base64url');

const cliArgs = [
    'secrets',
    'set',
    `ADMIN_PUBLISH_KEY=${secret}`,
    `APPOINTMENTS_ADMIN_KEY=${secret}`,
    '--project-ref',
    projectRef
];

function runSupabase() {
    const tried = [];
    const attempts = [
        () => execFileSync('supabase', cliArgs, { stdio: 'inherit', cwd: root, env: process.env }),
        () =>
            execFileSync(
                'npx',
                ['--yes', 'supabase', ...cliArgs],
                { stdio: 'inherit', cwd: root, env: process.env }
            )
    ];

    for (const run of attempts) {
        try {
            run();
            return true;
        } catch (err) {
            tried.push(err.message || String(err));
        }
    }
    return false;
}

console.log(`Project ref: ${projectRef}`);
console.log('Setting Edge Function secrets (ADMIN_PUBLISH_KEY + APPOINTMENTS_ADMIN_KEY)...\n');

if (!runSupabase()) {
    console.error('Could not run Supabase CLI. Install and log in, then retry:\n');
    console.error('  https://supabase.com/docs/guides/cli');
    console.error('  supabase login');
    console.error('  npm run set-admin-secrets\n');
    console.error('Set these manually in Dashboard → Edge Functions → Secrets, same value for both:\n');
    console.error('  ADMIN_PUBLISH_KEY');
    console.error('  APPOINTMENTS_ADMIN_KEY\n');
    console.log(secret);
    process.exit(1);
}

console.log('\nSecrets updated. Save this password in a password manager — it unlocks /admin/ after GitHub login.');
console.log('It is not stored in git.\n');
console.log('Admin password:\n');
console.log(secret);
console.log(
    '\nIf functions were already deployed, new secret values apply to the next invocation (no redeploy usually required).'
);
