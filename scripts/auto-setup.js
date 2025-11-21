/**
 * Automated Supabase Setup Script
 * This script automates the entire Supabase setup process
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { execSync } = require('child_process');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

console.log('🚀 Starting automated Supabase setup...\n');

// Step 1: Check if credentials are provided
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.log('⚠️  Environment variables not found in .env file');
    console.log('📝 Please create a .env file with your Supabase credentials:');
    console.log('   SUPABASE_URL=https://your-project.supabase.co');
    console.log('   SUPABASE_ANON_KEY=your-anon-key');
    console.log('   SUPABASE_SERVICE_KEY=your-service-key\n');
    console.log('💡 You can get these from: https://app.supabase.com/project/_/settings/api\n');
    process.exit(1);
}

console.log('✅ Step 1: Credentials found');
console.log(`   URL: ${SUPABASE_URL.substring(0, 30)}...\n`);

// Step 2: Test connection
console.log('🔌 Step 2: Testing Supabase connection...');
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const serviceSupabase = SUPABASE_SERVICE_KEY 
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    : null;

async function testConnection() {
    try {
        const { data, error } = await supabase.from('profiles').select('count').limit(1);
        if (error && error.code !== 'PGRST116') { // PGRST116 = table doesn't exist (expected)
            throw error;
        }
        console.log('✅ Connection successful\n');
        return true;
    } catch (error) {
        console.log('⚠️  Connection test failed (this is OK if tables don\'t exist yet)');
        console.log(`   Error: ${error.message}\n`);
        return false;
    }
}

// Step 3: Run migrations
async function runMigrations() {
    console.log('📦 Step 3: Running database migrations...');
    
    const sqlPath = path.join(__dirname, '..', 'supabase', 'supabase.sql');
    if (!fs.existsSync(sqlPath)) {
        console.log('❌ Migration file not found:', sqlPath);
        return false;
    }
    
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    if (!serviceSupabase) {
        console.log('⚠️  Service role key not provided. Cannot run migrations automatically.');
        console.log('📝 Please run the SQL manually in Supabase SQL Editor:');
        console.log(`   File: ${sqlPath}\n`);
        return false;
    }
    
    try {
        // Split SQL into statements
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));
        
        console.log(`   Found ${statements.length} SQL statements`);
        
        // Execute each statement
        let successCount = 0;
        let errorCount = 0;
        
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            if (!statement) continue;
            
            try {
                // Use RPC to execute SQL (if available) or direct query
                const { error } = await serviceSupabase.rpc('exec_sql', { sql: statement });
                if (error) {
                    // Try alternative method - direct query execution
                    // Note: Supabase JS client doesn't support raw SQL execution
                    // This would need to be done via REST API or CLI
                    console.log(`   ⚠️  Statement ${i + 1} needs manual execution`);
                    errorCount++;
                } else {
                    successCount++;
                }
            } catch (err) {
                errorCount++;
            }
        }
        
        if (errorCount > 0) {
            console.log(`\n⚠️  Some statements couldn't be executed automatically.`);
            console.log('📝 Please run the SQL manually in Supabase SQL Editor:');
            console.log(`   File: ${sqlPath}\n`);
            return false;
        }
        
        console.log(`✅ Migrations completed (${successCount} statements)\n`);
        return true;
    } catch (error) {
        console.log('❌ Migration error:', error.message);
        console.log('📝 Please run the SQL manually in Supabase SQL Editor\n');
        return false;
    }
}

// Step 4: Verify schema
async function verifySchema() {
    console.log('🔍 Step 4: Verifying database schema...');
    
    const requiredTables = [
        'profiles',
        'notes',
        'moods',
        'daily_check_ins',
        'articles',
        'chat_messages',
        'habits',
        'sleep_tracking',
        'goals'
    ];
    
    let allExist = true;
    
    for (const table of requiredTables) {
        try {
            const { data, error } = await supabase.from(table).select('count').limit(1);
            if (error && error.code === 'PGRST116') {
                console.log(`   ❌ Table '${table}' does not exist`);
                allExist = false;
            } else {
                console.log(`   ✅ Table '${table}' exists`);
            }
        } catch (error) {
            console.log(`   ⚠️  Could not verify table '${table}': ${error.message}`);
        }
    }
    
    if (allExist) {
        console.log('\n✅ All required tables exist\n');
    } else {
        console.log('\n⚠️  Some tables are missing. Please run migrations.\n');
    }
    
    return allExist;
}

// Step 5: Test read/write
async function testReadWrite() {
    console.log('🧪 Step 5: Testing read/write operations...');
    
    try {
        // Test read (should work even if empty)
        const { data: readData, error: readError } = await supabase
            .from('notes')
            .select('*')
            .limit(1);
        
        if (readError && readError.code !== 'PGRST116') {
            throw readError;
        }
        
        console.log('   ✅ Read operation successful');
        
        // Test write (requires authentication, so we'll skip if not authenticated)
        console.log('   ⚠️  Write test skipped (requires user authentication)');
        console.log('   💡 Write operations will be tested when a user signs up\n');
        
        return true;
    } catch (error) {
        console.log(`   ❌ Test failed: ${error.message}\n`);
        return false;
    }
}

// Step 6: Update code configuration
function updateCodeConfig() {
    console.log('🔧 Step 6: Updating code configuration...');
    
    const indexPath = path.join(__dirname, '..', 'index.html');
    let indexContent = fs.readFileSync(indexPath, 'utf8');
    
    // Check if environment variables are properly injected
    const hasEnvInjection = indexContent.includes('window.SUPABASE_URL') || 
                           indexContent.includes('process.env.SUPABASE_URL');
    
    if (hasEnvInjection) {
        console.log('   ✅ Code already configured for environment variables');
    } else {
        console.log('   ⚠️  Code may need environment variable injection');
    }
    
    // Create a config file that can be used at build time
    const configPath = path.join(__dirname, '..', 'supabase-config.js');
    const configContent = `// Auto-generated Supabase configuration
// This file is generated by auto-setup.js
// DO NOT commit this file to version control

window.SUPABASE_URL = '${SUPABASE_URL}';
window.SUPABASE_ANON_KEY = '${SUPABASE_ANON_KEY}';

// Load this script before script.supabase.js in index.html
`;

    fs.writeFileSync(configPath, configContent);
    console.log('   ✅ Created supabase-config.js');
    console.log('   📝 Add this script tag to index.html before script.supabase.js:');
    console.log('      <script src="supabase-config.js"></script>\n');
    
    return true;
}

// Main execution
async function main() {
    const connectionOk = await testConnection();
    if (!connectionOk) {
        console.log('⚠️  Connection test failed. Please check your credentials.\n');
    }
    
    const migrationsOk = await runMigrations();
    const schemaOk = await verifySchema();
    const testsOk = await testReadWrite();
    updateCodeConfig();
    
    console.log('\n📊 Setup Summary:');
    console.log(`   Connection: ${connectionOk ? '✅' : '⚠️'}`);
    console.log(`   Migrations: ${migrationsOk ? '✅' : '⚠️  (manual step required)'}`);
    console.log(`   Schema: ${schemaOk ? '✅' : '⚠️  (tables missing)'}`);
    console.log(`   Tests: ${testsOk ? '✅' : '⚠️'}`);
    
    if (!migrationsOk) {
        console.log('\n📝 Next Steps:');
        console.log('   1. Go to https://app.supabase.com');
        console.log('   2. Select your project');
        console.log('   3. Go to SQL Editor');
        console.log('   4. Copy contents of supabase/supabase.sql');
        console.log('   5. Paste and run in SQL Editor\n');
    }
    
    if (schemaOk && testsOk) {
        console.log('\n🎉 Setup complete! Your Supabase integration is ready.\n');
    } else {
        console.log('\n⚠️  Setup incomplete. Please complete the manual steps above.\n');
    }
}

main().catch(console.error);

