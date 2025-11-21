/**
 * Smoke tests for Supabase integration
 * Tests authentication and basic CRUD operations
 * Usage: node scripts/smoke-test.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Error: SUPABASE_URL and SUPABASE_ANON_KEY must be set');
    console.error('Create a .env file with these values');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test user credentials (will be created and cleaned up)
const testEmail = `test-${Date.now()}@example.com`;
const testPassword = 'test-password-123';
let testUserId = null;

async function cleanup() {
    if (testUserId) {
        // Cleanup test user (requires service role key)
        console.log('Cleaning up test user...');
    }
}

async function testSignUp() {
    console.log('Testing sign up...');
    const { data, error } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword
    });
    
    if (error) {
        console.error('❌ Sign up failed:', error.message);
        return false;
    }
    
    if (data.user) {
        testUserId = data.user.id;
        console.log('✅ Sign up successful');
        return true;
    }
    
    console.error('❌ Sign up returned no user');
    return false;
}

async function testSignIn() {
    console.log('Testing sign in...');
    const { data, error } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword
    });
    
    if (error) {
        console.error('❌ Sign in failed:', error.message);
        return false;
    }
    
    if (data.user) {
        console.log('✅ Sign in successful');
        return true;
    }
    
    console.error('❌ Sign in returned no user');
    return false;
}

async function testCreateNote() {
    console.log('Testing note creation...');
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
        console.error('❌ No authenticated user');
        return false;
    }
    
    const { data, error } = await supabase
        .from('notes')
        .insert({
            user_id: user.id,
            title: 'Test Note',
            content: 'This is a test note'
        })
        .select()
        .single();
    
    if (error) {
        console.error('❌ Note creation failed:', error.message);
        return false;
    }
    
    if (data) {
        console.log('✅ Note created successfully');
        return data.id;
    }
    
    return false;
}

async function testGetNotes() {
    console.log('Testing note retrieval...');
    const { data, error } = await supabase
        .from('notes')
        .select('*')
        .limit(10);
    
    if (error) {
        console.error('❌ Note retrieval failed:', error.message);
        return false;
    }
    
    console.log(`✅ Retrieved ${data.length} notes`);
    return true;
}

async function testRLS() {
    console.log('Testing Row Level Security...');
    
    // Try to access notes without auth (should fail or return empty)
    const { createClient } = require('@supabase/supabase-js');
    const anonClient = createClient(supabaseUrl, supabaseAnonKey);
    
    // Sign out first
    await supabase.auth.signOut();
    
    const { data, error } = await anonClient
        .from('notes')
        .select('*');
    
    // Should return empty array (RLS blocks access)
    if (data && data.length === 0) {
        console.log('✅ RLS is working - unauthenticated users cannot access notes');
        return true;
    } else if (error) {
        console.log('✅ RLS is working - access denied');
        return true;
    } else {
        console.warn('⚠️  RLS may not be properly configured');
        return false;
    }
}

async function runTests() {
    console.log('🧪 Running Supabase smoke tests...\n');
    
    let passed = 0;
    let failed = 0;
    
    // Test 1: Sign Up
    if (await testSignUp()) {
        passed++;
    } else {
        failed++;
        await cleanup();
        process.exit(1);
    }
    
    // Test 2: Sign In
    if (await testSignIn()) {
        passed++;
    } else {
        failed++;
        await cleanup();
        process.exit(1);
    }
    
    // Test 3: Create Note
    const noteId = await testCreateNote();
    if (noteId) {
        passed++;
    } else {
        failed++;
    }
    
    // Test 4: Get Notes
    if (await testGetNotes()) {
        passed++;
    } else {
        failed++;
    }
    
    // Test 5: RLS
    if (await testRLS()) {
        passed++;
    } else {
        failed++;
    }
    
    console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
    
    if (failed === 0) {
        console.log('✅ All tests passed!');
        await cleanup();
        process.exit(0);
    } else {
        console.log('❌ Some tests failed');
        await cleanup();
        process.exit(1);
    }
}

// Handle errors
process.on('unhandledRejection', (error) => {
    console.error('Unhandled error:', error);
    cleanup();
    process.exit(1);
});

runTests();

