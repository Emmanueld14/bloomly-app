/**
 * Test Bytez API Connection
 * Helps find the correct API endpoint
 */

const BYTEZ_API_KEY = '7b2126049f04e196d885fdcbb247a136';
const MODEL = 'Qwen/Qwen3-0.6B';

const testEndpoints = [
    'https://api.bytez.com/v1/chat/completions',
    'https://api.bytez.com/api/v1/chat/completions',
    'https://api.bytez.com/chat/completions',
    'https://api.bytez.com/v1/completions',
    'https://api.bytez.com/api/completions',
    'https://bytez.com/api/v1/chat/completions',
    'https://bytez.com/v1/chat/completions'
];

async function testEndpoint(url) {
    const payload = {
        model: MODEL,
        messages: [
            { role: 'user', content: 'Hello' }
        ]
    };

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${BYTEZ_API_KEY}`,
        'X-API-Key': BYTEZ_API_KEY
    };

    try {
        console.log(`Testing: ${url}`);
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });

        const status = response.status;
        const data = await response.json().catch(() => ({ error: 'Invalid JSON' }));

        if (response.ok) {
            console.log(`✅ SUCCESS: ${url}`);
            console.log('Response:', JSON.stringify(data, null, 2));
            return { success: true, url, data };
        } else {
            console.log(`❌ Failed (${status}): ${url}`);
            console.log('Error:', data);
            return { success: false, url, status, error: data };
        }
    } catch (error) {
        console.log(`❌ Error: ${url}`);
        console.log('Error:', error.message);
        return { success: false, url, error: error.message };
    }
}

async function testAll() {
    console.log('🔍 Testing Bytez API endpoints...\n');
    console.log(`API Key: ${BYTEZ_API_KEY.substring(0, 10)}...`);
    console.log(`Model: ${MODEL}\n`);

    const results = [];
    for (const endpoint of testEndpoints) {
        const result = await testEndpoint(endpoint);
        results.push(result);
        await new Promise(resolve => setTimeout(resolve, 500)); // Delay between requests
    }

    console.log('\n📊 Summary:');
    const successful = results.filter(r => r.success);
    if (successful.length > 0) {
        console.log(`✅ Found ${successful.length} working endpoint(s):`);
        successful.forEach(r => console.log(`   - ${r.url}`));
    } else {
        console.log('❌ No working endpoints found');
        console.log('\n💡 Next steps:');
        console.log('   1. Check Bytez API documentation for the correct endpoint');
        console.log('   2. Verify your API key is correct');
        console.log('   3. Check if the API requires different authentication');
        console.log('   4. The API might require a server-side proxy due to CORS');
    }
}

// Run if in Node.js environment
if (typeof require !== 'undefined' && require.main === module) {
    testAll();
}

// Export for browser use
if (typeof window !== 'undefined') {
    window.testBytezEndpoints = testAll;
}

