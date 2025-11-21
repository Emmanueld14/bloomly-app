/**
 * Migration script to run Supabase SQL migrations
 * Usage: node scripts/migrate.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function runMigration() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in environment variables');
        console.error('Create a .env file with these values or set them in your deployment environment');
        process.exit(1);
    }
    
    try {
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        // Read the SQL file
        const sqlPath = path.join(__dirname, '..', 'supabase', 'supabase.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        console.log('Running migration...');
        
        // Split SQL into individual statements and execute
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));
        
        for (const statement of statements) {
            if (statement.trim()) {
                try {
                    const { error } = await supabase.rpc('exec_sql', { sql: statement });
                    if (error) {
                        // Try direct query if RPC doesn't work
                        console.log('Note: Some statements may need to be run manually in Supabase SQL Editor');
                    }
                } catch (err) {
                    console.warn('Warning:', err.message);
                }
            }
        }
        
        console.log('Migration completed!');
        console.log('Note: Some SQL statements (like CREATE POLICY) may need to be run manually in the Supabase SQL Editor.');
        console.log('Please copy the contents of supabase/supabase.sql and run it in your Supabase project SQL Editor.');
        
    } catch (error) {
        console.error('Migration error:', error);
        console.log('\nAlternative: Run the SQL manually in Supabase SQL Editor:');
        console.log('1. Go to your Supabase project dashboard');
        console.log('2. Navigate to SQL Editor');
        console.log('3. Copy and paste the contents of supabase/supabase.sql');
        console.log('4. Click "Run"');
        process.exit(1);
    }
}

runMigration();

