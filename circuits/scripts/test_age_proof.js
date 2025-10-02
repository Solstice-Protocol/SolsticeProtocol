#!/usr/bin/env node
/**
 * Test script for age proof circuit
 * Generates and verifies a sample age proof
 */

const snarkjs = require('snarkjs');
const fs = require('fs');
const path = require('path');

const BUILD_DIR = path.join(__dirname, '..', 'build');

async function testAgeProof() {
    console.log('🧪 Testing Age Proof Circuit\n');
    console.log('═'.repeat(50));
    
    // Check if files exist
    const wasmPath = path.join(BUILD_DIR, 'age_proof_js', 'age_proof.wasm');
    const zkeyPath = path.join(BUILD_DIR, 'age_proof_final.zkey');
    const vkeyPath = path.join(BUILD_DIR, 'age_proof_verification_key.json');
    
    if (!fs.existsSync(wasmPath)) {
        console.error('❌ WASM file not found:', wasmPath);
        console.error('   Run: npm run compile:age');
        process.exit(1);
    }
    
    if (!fs.existsSync(zkeyPath)) {
        console.error('❌ Proving key not found:', zkeyPath);
        console.error('   Run: npm run setup:age');
        process.exit(1);
    }
    
    if (!fs.existsSync(vkeyPath)) {
        console.error('❌ Verification key not found:', vkeyPath);
        console.error('   Run: npm run setup:age');
        process.exit(1);
    }
    
    console.log('✅ All circuit files found\n');
    
    // Test Case 1: User is 25, proving they are above 18
    console.log('Test Case 1: Age Verification (25 >= 18)');
    console.log('-'.repeat(50));
    
    const input1 = {
        age: "25",
        minAge: "18",
        isAboveAge: "1",  // Should be 1 (true)
        identitySecret: "12345",
        commitmentHash: "0"
    };
    
    console.log('Input:', JSON.stringify(input1, null, 2));
    
    try {
        console.log('\n⏳ Generating proof...');
        const startTime = Date.now();
        
        const { proof, publicSignals } = await snarkjs.groth16.fullProve(
            input1,
            wasmPath,
            zkeyPath
        );
        
        const proofTime = Date.now() - startTime;
        console.log(`✅ Proof generated in ${proofTime}ms`);
        
        console.log('\nPublic Signals:', publicSignals);
        console.log('Proof size:', JSON.stringify(proof).length, 'bytes');
        
        // Verify the proof
        console.log('\n⏳ Verifying proof...');
        const vkey = JSON.parse(fs.readFileSync(vkeyPath, 'utf8'));
        const verifyStartTime = Date.now();
        
        const isValid = await snarkjs.groth16.verify(vkey, publicSignals, proof);
        
        const verifyTime = Date.now() - verifyStartTime;
        console.log(`${isValid ? '✅' : '❌'} Proof ${isValid ? 'verified' : 'failed'} in ${verifyTime}ms`);
        
        if (!isValid) {
            console.error('❌ Test Case 1 FAILED');
            process.exit(1);
        }
        
        console.log('✅ Test Case 1 PASSED\n');
        
    } catch (error) {
        console.error('❌ Error in Test Case 1:', error.message);
        process.exit(1);
    }
    
    // Test Case 2: User is 17, proving they are NOT above 18
    console.log('\n' + '='.repeat(50));
    console.log('Test Case 2: Age Verification (17 < 18)');
    console.log('-'.repeat(50));
    
    const input2 = {
        age: "17",
        minAge: "18",
        isAboveAge: "0",  // Should be 0 (false)
        identitySecret: "12345",
        commitmentHash: "0"
    };
    
    console.log('Input:', JSON.stringify(input2, null, 2));
    
    try {
        console.log('\n⏳ Generating proof...');
        const startTime = Date.now();
        
        const { proof, publicSignals } = await snarkjs.groth16.fullProve(
            input2,
            wasmPath,
            zkeyPath
        );
        
        const proofTime = Date.now() - startTime;
        console.log(`✅ Proof generated in ${proofTime}ms`);
        
        console.log('\nPublic Signals:', publicSignals);
        
        // Verify the proof
        console.log('\n⏳ Verifying proof...');
        const vkey = JSON.parse(fs.readFileSync(vkeyPath, 'utf8'));
        const verifyStartTime = Date.now();
        
        const isValid = await snarkjs.groth16.verify(vkey, publicSignals, proof);
        
        const verifyTime = Date.now() - verifyStartTime;
        console.log(`${isValid ? '✅' : '❌'} Proof ${isValid ? 'verified' : 'failed'} in ${verifyTime}ms`);
        
        if (!isValid) {
            console.error('❌ Test Case 2 FAILED');
            process.exit(1);
        }
        
        console.log('✅ Test Case 2 PASSED\n');
        
    } catch (error) {
        console.error('❌ Error in Test Case 2:', error.message);
        process.exit(1);
    }
    
    // Test Case 3: Invalid case - should fail
    console.log('\n' + '='.repeat(50));
    console.log('Test Case 3: Invalid Proof (age=17, claim>=18)');
    console.log('-'.repeat(50));
    
    const input3 = {
        age: "17",
        minAge: "18",
        isAboveAge: "1",  // WRONG! Should be 0
        identitySecret: "12345",
        commitmentHash: "0"
    };
    
    console.log('Input:', JSON.stringify(input3, null, 2));
    
    try {
        console.log('\n⏳ Generating proof (should fail)...');
        
        await snarkjs.groth16.fullProve(
            input3,
            wasmPath,
            zkeyPath
        );
        
        console.error('❌ Test Case 3 FAILED: Proof should not have been generated');
        process.exit(1);
        
    } catch (error) {
        console.log('✅ Expected failure:', error.message.substring(0, 100));
        console.log('✅ Test Case 3 PASSED (correctly rejected)\n');
    }
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Test Summary');
    console.log('='.repeat(50));
    console.log('✅ All tests passed!');
    console.log('✅ Age proof circuit is working correctly');
    console.log('✅ Groth16 verification is functioning');
    console.log('\n🎉 Circuit is ready for production use!\n');
}

// Run the test
testAgeProof().catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
});
