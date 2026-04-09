/**
 * Test script for Magic Link Token System
 * Run this after starting Firebase emulators
 *
 * Usage: node test-magic-link.js
 */

const crypto = require('crypto');

const FUNCTIONS_URL = 'http://127.0.0.1:5001/swiftcause-app/us-central1';

// Test data
const testToken = crypto.randomBytes(32).toString('base64url');
const testTokenHash = crypto.createHash('sha256').update(testToken).digest('hex');

console.log('🧪 Magic Link Token Test\n');
console.log('Test Token (plain):', testToken);
console.log('Test Token Hash:', testTokenHash);
console.log('\n📋 Test Steps:\n');

async function testValidation() {
  console.log('1️⃣ Testing Token Validation...');

  try {
    const response = await fetch(`${FUNCTIONS_URL}/validateMagicLinkToken`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token: testToken }),
    });

    const data = await response.json();
    console.log('   Status:', response.status);
    console.log('   Response:', JSON.stringify(data, null, 2));

    if (response.status === 404 && data.error === 'TOKEN_NOT_FOUND') {
      console.log('   ✅ Expected: Token not found (no test data in emulator)\n');
      return null;
    }

    return data;
  } catch (error) {
    console.error('   ❌ Error:', error.message);
    return null;
  }
}

async function testConsumption(tokenId) {
  console.log('2️⃣ Testing Token Consumption...');

  if (!tokenId) {
    console.log('   ⏭️  Skipped (no valid token to consume)\n');
    return;
  }

  try {
    const response = await fetch(`${FUNCTIONS_URL}/consumeMagicLinkToken`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tokenId }),
    });

    const data = await response.json();
    console.log('   Status:', response.status);
    console.log('   Response:', JSON.stringify(data, null, 2));

    if (data.success) {
      console.log('   ✅ Token consumed successfully\n');
    }
  } catch (error) {
    console.error('   ❌ Error:', error.message);
  }
}

async function runTests() {
  console.log('🔌 Connecting to Firebase Emulators...');
  console.log(`   Functions: ${FUNCTIONS_URL}\n`);

  // Test validation
  const validationResult = await testValidation();

  // Test consumption if we got a valid token
  if (validationResult?.tokenId) {
    await testConsumption(validationResult.tokenId);
  }

  console.log('✅ Tests complete!\n');
  console.log('📝 Next Steps:');
  console.log('   1. Create a test donation with Gift Aid enabled');
  console.log('   2. Check Firestore emulator for generated token');
  console.log('   3. Use the plain token to test validation');
  console.log('   4. Visit: http://localhost:3000/link/{token}');
}

// Run tests
runTests().catch(console.error);
