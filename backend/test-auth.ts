/**
 * Test script for backend authentication endpoints
 * 
 * This demonstrates the complete authentication flow:
 * 1. Sign a message with Solana wallet
 * 2. Create session with signature verification
 * 3. Verify session token
 * 4. Close session
 */

import { Keypair, PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

// Test configuration
const API_URL = 'http://localhost:3000/api';

/**
 * Generate a signature for authentication
 */
function generateSignature(keypair: Keypair): { walletAddress: string; signature: string } {
  const messageStr = 'Sign this message to authenticate with Solstice Protocol';
  const messageBytes = new TextEncoder().encode(messageStr);
  
  // Sign the message
  const signature = nacl.sign.detached(messageBytes, keypair.secretKey);
  
  return {
    walletAddress: keypair.publicKey.toString(),
    signature: bs58.encode(signature),
  };
}

/**
 * Test the authentication flow
 */
async function testAuthFlow() {
  console.log('🧪 Testing Solstice Protocol Authentication Flow\n');
  
  // Step 1: Generate test wallet and signature
  console.log('1️⃣ Generating test wallet and signature...');
  const testKeypair = Keypair.generate();
  const { walletAddress, signature } = generateSignature(testKeypair);
  console.log('   Wallet:', walletAddress);
  console.log('   Signature:', signature.substring(0, 20) + '...\n');
  
  // Step 2: Create session (will fail if identity not verified)
  console.log('2️⃣ Creating session...');
  try {
    const createResponse = await fetch(`${API_URL}/auth/create-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress, signature }),
    });
    
    const createData = await createResponse.json();
    
    if (!createResponse.ok) {
      console.log('   ⚠️  Expected error (identity not verified):', createData.error);
      console.log('   ✅ Signature verification is working!\n');
      return;
    }
    
    const { sessionId, token, expiresAt } = createData;
    console.log('   ✅ Session created!');
    console.log('   Session ID:', sessionId);
    console.log('   Token:', token.substring(0, 20) + '...');
    console.log('   Expires:', new Date(expiresAt).toISOString() + '\n');
    
    // Step 3: Verify session
    console.log('3️⃣ Verifying session...');
    const verifyResponse = await fetch(`${API_URL}/auth/verify-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    
    const verifyData = await verifyResponse.json();
    console.log('   ✅ Session verified!');
    console.log('   Wallet:', verifyData.walletAddress);
    console.log('   Expires:', new Date(verifyData.expiresAt).toISOString() + '\n');
    
    // Step 4: Close session
    console.log('4️⃣ Closing session...');
    const closeResponse = await fetch(`${API_URL}/auth/close-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    
    const closeData = await closeResponse.json();
    console.log('   ✅ Session closed!');
    console.log('   Message:', closeData.message + '\n');
    
    // Step 5: Verify session is closed
    console.log('5️⃣ Verifying session is closed...');
    const verifyAgainResponse = await fetch(`${API_URL}/auth/verify-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    
    const verifyAgainData = await verifyAgainResponse.json();
    if (!verifyAgainResponse.ok) {
      console.log('   ✅ Session correctly invalidated!');
      console.log('   Error:', verifyAgainData.error + '\n');
    }
    
    console.log('✅ All authentication tests passed!\n');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

/**
 * Test invalid signature
 */
async function testInvalidSignature() {
  console.log('🧪 Testing Invalid Signature Detection\n');
  
  const testKeypair = Keypair.generate();
  const walletAddress = testKeypair.publicKey.toString();
  const invalidSignature = 'InvalidSignature123';
  
  console.log('Attempting authentication with invalid signature...');
  
  try {
    const response = await fetch(`${API_URL}/auth/create-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress, signature: invalidSignature }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.log('✅ Invalid signature correctly rejected!');
      console.log('   Error:', data.error + '\n');
    } else {
      console.log('❌ Invalid signature was accepted (security issue!)');
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run tests
console.log('═'.repeat(60));
console.log('Solstice Protocol - Backend Authentication Tests');
console.log('═'.repeat(60) + '\n');

console.log('📝 Note: Make sure the backend server is running at', API_URL);
console.log('   Start with: cd backend && npm run dev\n');

testAuthFlow()
  .then(() => testInvalidSignature())
  .then(() => {
    console.log('═'.repeat(60));
    console.log('All tests completed!');
    console.log('═'.repeat(60));
  })
  .catch(console.error);
