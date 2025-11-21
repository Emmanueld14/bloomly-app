/**
 * Full Automated Supabase Setup
 * Attempts to automatically detect/create Supabase project and complete setup
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const https = require('https');

const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

console.log('🚀 Full Automated Supabase Setup\n');

// Step 1: Try to detect or create Supabase project
async function detectOrCreateProject() {
    console.log('🔍 Step 1: Detecting Supabase project...');
    
    // If credentials already exist, use them
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
        console.log('✅ Found existing Supabase credentials');
        console.log(`   URL: ${SUPABASE_URL.substring(0, 40)}...\n`);
        return { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY, serviceKey: SUPABASE_SERVICE_KEY };
    }
    
    // Try to use Supabase CLI to link to existing project
    try {
        const { execSync } = require('child_process');
        console.log('   Checking for Supabase CLI...');
        
        // Check if supabase is installed
        try {
            execSync('supabase --version', { stdio: 'ignore' });
            console.log('   ✅ Supabase CLI found');
            
            // Check if project is already linked
            const configPath = path.join(__dirname, '..', '.supabase', 'config.toml');
            if (fs.existsSync(configPath)) {
                console.log('   ✅ Found linked Supabase project');
                // Try to get project info
                try {
                    const linkInfo = execSync('supabase status', { encoding: 'utf8' });
                    console.log('   Project status retrieved\n');
                    // Parse and return project info if available
                } catch (e) {
                    console.log('   ⚠️  Could not get project status');
                }
            }
        } catch (e) {
            console.log('   ⚠️  Supabase CLI not found');
            console.log('   💡 Install with: npm install -g supabase\n');
        }
    } catch (e) {
        // CLI not available, continue with manual setup
    }
    
    console.log('   ⚠️  No existing project detected');
    console.log('   📝 Please create a Supabase project at: https://app.supabase.com');
    console.log('   📝 Then add credentials to .env file\n');
    
    return null;
}

// Step 2: Run migrations using Management API or direct SQL
async function runMigrationsAutomatically(supabaseUrl, serviceKey) {
    console.log('📦 Step 2: Running database migrations...');
    
    if (!serviceKey) {
        console.log('   ⚠️  Service role key not provided');
        console.log('   📝 Migrations will need to be run manually\n');
        return false;
    }
    
    const sqlPath = path.join(__dirname, '..', 'supabase', 'supabase.sql');
    if (!fs.existsSync(sqlPath)) {
        console.log('   ❌ Migration file not found\n');
        return false;
    }
    
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Use Supabase Management API to execute SQL
    try {
        const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
        if (!projectRef) {
            throw new Error('Could not extract project ref from URL');
        }
        
        console.log(`   Attempting to run migrations for project: ${projectRef}`);
        
        // Note: Supabase Management API requires access token
        // For now, we'll use the service role key with direct SQL execution
        // This requires using the REST API endpoint
        
        const serviceSupabase = createClient(supabaseUrl, serviceKey);
        
        // Split SQL into executable statements
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => {
                const trimmed = s.trim();
                return trimmed.length > 0 && 
                       !trimmed.startsWith('--') && 
                       !trimmed.startsWith('/*') &&
                       !trimmed.match(/^\s*\/\*/);
            });
        
        console.log(`   Found ${statements.length} SQL statements`);
        console.log('   ⚠️  Direct SQL execution via JS client is limited');
        console.log('   📝 Please run migrations manually in Supabase SQL Editor:');
        console.log(`      File: ${sqlPath}\n`);
        
        return false;
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        console.log('   📝 Please run migrations manually in Supabase SQL Editor\n');
        return false;
    }
}

// Step 3: Verify and test
async function verifyAndTest(supabaseUrl, anonKey) {
    console.log('✅ Step 3: Verifying setup...');
    
    const supabase = createClient(supabaseUrl, anonKey);
    
    // Test connection
    try {
        const { data, error } = await supabase.from('profiles').select('count').limit(1);
        if (error && error.code === 'PGRST116') {
            console.log('   ⚠️  Tables not found - migrations need to be run');
        } else if (error) {
            console.log(`   ⚠️  Connection test: ${error.message}`);
        } else {
            console.log('   ✅ Connection successful');
        }
    } catch (error) {
        console.log(`   ⚠️  Connection test failed: ${error.message}`);
    }
    
    console.log('');
}

// Step 4: Create configuration files
function createConfigFiles(supabaseUrl, anonKey) {
    console.log('📝 Step 4: Creating configuration files...');
    
    // Create .env if it doesn't exist
    const envPath = path.join(__dirname, '..', '.env');
    if (!fs.existsSync(envPath)) {
        const envContent = `# Supabase Configuration
# Auto-generated by full-auto-setup.js

SUPABASE_URL=${supabaseUrl}
SUPABASE_ANON_KEY=${anonKey}
${SUPABASE_SERVICE_KEY ? `SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY}` : '# SUPABASE_SERVICE_KEY=your-service-role-key-here'}
`;
        fs.writeFileSync(envPath, envContent);
        console.log('   ✅ Created .env file');
    } else {
        console.log('   ✅ .env file already exists');
    }
    
    // Create supabase-config.js for client-side
    const configPath = path.join(__dirname, '..', 'supabase-config.js');
    const configContent = `// Auto-generated Supabase configuration
// This file is generated by auto-setup.js
// DO NOT commit this file to version control

window.SUPABASE_URL = '${supabaseUrl}';
window.SUPABASE_ANON_KEY = '${anonKey}';
`;
    
    fs.writeFileSync(configPath, configContent);
    console.log('   ✅ Created supabase-config.js');
    console.log('');
}

// Main execution
async function main() {
    const project = await detectOrCreateProject();
    
    if (!project) {
        console.log('📋 Manual Setup Required:');
        console.log('   1. Create project at https://app.supabase.com');
        console.log('   2. Get credentials from Settings → API');
        console.log('   3. Create .env file with:');
        console.log('      SUPABASE_URL=your-url');
        console.log('      SUPABASE_ANON_KEY=your-anon-key');
        console.log('      SUPABASE_SERVICE_KEY=your-service-key');
        console.log('   4. Run: npm run setup\n');
        return;
    }
    
    createConfigFiles(project.url, project.anonKey);
    await runMigrationsAutomatically(project.url, project.serviceKey);
    await verifyAndTest(project.url, project.anonKey);
    
    console.log('📊 Setup Summary:');
    console.log('   ✅ Configuration files created');
    console.log('   ⚠️  Migrations: Manual step required');
    console.log('   💡 Next: Run SQL in Supabase SQL Editor\n');
    console.log('🎯 To complete setup:');
    console.log('   1. Go to https://app.supabase.com');
    console.log('   2. Select your project');
    console.log('   3. Go to SQL Editor');
    console.log('   4. Copy contents of supabase/supabase.sql');
    console.log('   5. Paste and run\n');
}

main().catch(console.error);

