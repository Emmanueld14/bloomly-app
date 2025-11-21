/**
 * Test Supabase Connection
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://qifalarexcszkhwxzeir.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_oQuKmrT-0qwhGKsW0HdtzA__CnLadnL';

console.log('🔌 Testing Supabase connection...\n');
console.log(`URL: ${SUPABASE_URL}`);
console.log(`Key: ${SUPABASE_ANON_KEY.substring(0, 20)}...\n`);

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function test() {
    try {
        // Test basic connection
        const { data, error } = await supabase.from('profiles').select('count').limit(1);
        
        if (error) {
            if (error.code === 'PGRST116') {
                console.log('✅ Connection successful!');
                console.log('⚠️  Tables not found - this is expected. You need to run migrations.\n');
                return true;
            } else {
                throw error;
            }
        }
        
        console.log('✅ Connection successful!');
        console.log('✅ Tables exist!\n');
        return true;
    } catch (error) {
        console.log('❌ Connection failed:');
        console.log(`   Error: ${error.message}`);
        console.log(`   Code: ${error.code || 'N/A'}\n`);
        return false;
    }
}

test().then(success => {
    if (success) {
        console.log('🎉 Setup ready! Next step: Run migrations in Supabase SQL Editor.');
    } else {
        console.log('⚠️  Please check your credentials.');
    }
    process.exit(success ? 0 : 1);
});

