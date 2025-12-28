/**
 * Quick test script to verify household creation endpoint works
 * Run with: node test-household.js
 */

const baseURL = 'http://127.0.0.1:4002';

// Test without auth (should fail)
async function testWithoutAuth() {
  console.log('\n1. Testing household creation WITHOUT auth (should fail)...');
  try {
    const response = await fetch(`${baseURL}/household`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Test Household' }),
    });
    
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', data);
    
    if (response.status === 401) {
      console.log('✅ Correctly rejected unauthenticated request');
    } else {
      console.log('❌ Expected 401 but got:', response.status);
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

// Test with fake auth (should also fail)
async function testWithFakeAuth() {
  console.log('\n2. Testing household creation with FAKE auth token (should fail)...');
  try {
    const response = await fetch(`${baseURL}/household`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer fake-token-12345',
      },
      body: JSON.stringify({ name: 'Test Household' }),
    });
    
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', data);
    
    if (response.status === 401) {
      console.log('✅ Correctly rejected fake auth token');
    } else {
      console.log('❌ Expected 401 but got:', response.status);
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

// Run tests
async function main() {
  console.log('Testing Household Creation Endpoint');
  console.log('Backend:', baseURL);
  console.log('='.repeat(50));
  
  await testWithoutAuth();
  await testWithFakeAuth();
  
  console.log('\n' + '='.repeat(50));
  console.log('\nTo test with REAL Clerk auth:');
  console.log('1. Sign in on your mobile app');
  console.log('2. Check the Expo console for the auth token');
  console.log('3. Replace "fake-token-12345" above with the real token');
  console.log('4. Re-run this script\n');
}

main().catch(console.error);
