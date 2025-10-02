#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const circuits = ['age_proof', 'nationality_proof', 'uniqueness_proof'];
const buildDir = path.join(__dirname, '../build');
const outputFile = path.join(__dirname, '../../contracts/programs/contracts/src/verification_keys.rs');

function bigIntToBytes(bigInt) {
    // Convert bigint string to 32-byte array (little-endian)
    const hex = BigInt(bigInt).toString(16).padStart(64, '0');
    const bytes = [];
    for (let i = hex.length - 2; i >= 0; i -= 2) {
        bytes.push('0x' + hex.substr(i, 2));
    }
    // Pad to 32 bytes
    while (bytes.length < 32) {
        bytes.push('0x00');
    }
    return bytes.slice(0, 32);
}

function convertVKeyToRust(vkeyPath, name) {
    const vkey = JSON.parse(fs.readFileSync(vkeyPath, 'utf8'));
    
    console.log(`\nProcessing ${name}...`);
    console.log(`Public inputs: ${vkey.nPublic}`);
    
    let rustCode = `\n    /// ${name} verification key (BN254 curve, ${vkey.nPublic} public inputs)\n`;
    rustCode += `    pub const ${name.toUpperCase()}_VK: VerificationKey = VerificationKey {\n`;
    
    // Alpha G1 (2 field elements)
    const alpha = [
        bigIntToBytes(vkey.vk_alpha_1[0]),
        bigIntToBytes(vkey.vk_alpha_1[1])
    ];
    rustCode += `        alpha_g1: [\n`;
    rustCode += `            [${alpha[0].join(', ')}],\n`;
    rustCode += `            [${alpha[1].join(', ')}]\n`;
    rustCode += `        ],\n`;
    
    // Beta G2 (4 field elements - 2 pairs)
    const beta = [
        bigIntToBytes(vkey.vk_beta_2[0][0]),
        bigIntToBytes(vkey.vk_beta_2[0][1]),
        bigIntToBytes(vkey.vk_beta_2[1][0]),
        bigIntToBytes(vkey.vk_beta_2[1][1])
    ];
    rustCode += `        beta_g2: [\n`;
    rustCode += `            [${beta[0].join(', ')}],\n`;
    rustCode += `            [${beta[1].join(', ')}],\n`;
    rustCode += `            [${beta[2].join(', ')}],\n`;
    rustCode += `            [${beta[3].join(', ')}]\n`;
    rustCode += `        ],\n`;
    
    // Gamma G2
    const gamma = [
        bigIntToBytes(vkey.vk_gamma_2[0][0]),
        bigIntToBytes(vkey.vk_gamma_2[0][1]),
        bigIntToBytes(vkey.vk_gamma_2[1][0]),
        bigIntToBytes(vkey.vk_gamma_2[1][1])
    ];
    rustCode += `        gamma_g2: [\n`;
    rustCode += `            [${gamma[0].join(', ')}],\n`;
    rustCode += `            [${gamma[1].join(', ')}],\n`;
    rustCode += `            [${gamma[2].join(', ')}],\n`;
    rustCode += `            [${gamma[3].join(', ')}]\n`;
    rustCode += `        ],\n`;
    
    // Delta G2
    const delta = [
        bigIntToBytes(vkey.vk_delta_2[0][0]),
        bigIntToBytes(vkey.vk_delta_2[0][1]),
        bigIntToBytes(vkey.vk_delta_2[1][0]),
        bigIntToBytes(vkey.vk_delta_2[1][1])
    ];
    rustCode += `        delta_g2: [\n`;
    rustCode += `            [${delta[0].join(', ')}],\n`;
    rustCode += `            [${delta[1].join(', ')}],\n`;
    rustCode += `            [${delta[2].join(', ')}],\n`;
    rustCode += `            [${delta[3].join(', ')}]\n`;
    rustCode += `        ],\n`;
    
    // IC points (nPublic + 1 points, each is 2 field elements)
    const ic = vkey.IC;
    rustCode += `        ic: &[\n`;
    for (let i = 0; i < ic.length; i++) {
        const point = [
            bigIntToBytes(ic[i][0]),
            bigIntToBytes(ic[i][1])
        ];
        rustCode += `            [\n`;
        rustCode += `                [${point[0].join(', ')}],\n`;
        rustCode += `                [${point[1].join(', ')}]\n`;
        rustCode += `            ]${i < ic.length - 1 ? ',' : ''}\n`;
    }
    rustCode += `        ]\n`;
    rustCode += `    };\n`;
    
    return rustCode;
}

// Generate the Rust file
let output = `// Auto-generated verification keys for Groth16 proofs
// Generated from circuit compilation outputs
// DO NOT EDIT MANUALLY

use anchor_lang::prelude::*;

/// Verification key structure for Groth16 proofs on BN254 curve
#[derive(Clone, Copy)]
pub struct VerificationKey {
    pub alpha_g1: [[u8; 32]; 2],
    pub beta_g2: [[u8; 32]; 4],
    pub gamma_g2: [[u8; 32]; 4],
    pub delta_g2: [[u8; 32]; 4],
    pub ic: &'static [[[u8; 32]; 2]],
}
`;

for (const circuit of circuits) {
    const vkeyPath = path.join(buildDir, `${circuit}_verification_key.json`);
    if (!fs.existsSync(vkeyPath)) {
        console.error(`Verification key not found: ${vkeyPath}`);
        console.error(`   Run 'npm run build' in circuits directory first.`);
        continue;
    }
    
    output += convertVKeyToRust(vkeyPath, circuit);
}

// Write to file
fs.writeFileSync(outputFile, output);
console.log(`\nVerification keys exported to: ${outputFile}`);
console.log(`Generated ${circuits.length} verification keys`);
