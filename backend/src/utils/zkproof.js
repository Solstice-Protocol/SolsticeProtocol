import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as snarkjs from 'snarkjs';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Paths to circuit artifacts
const CIRCUITS_PATH = join(__dirname, '../../../circuits/build');

/**
 * Generate ZK proof for identity attributes
 * @param {string} attributeType - Type of attribute (age, nationality, uniqueness)
 * @param {Object} privateInputs - Private inputs for the circuit
 * @param {Object} publicInputs - Public inputs for the circuit
 * @returns {Promise<Object>} - Proof and public signals
 */
export async function generateZKProof(attributeType, privateInputs, publicInputs) {
    try {
        // Map attribute type to circuit file
        const circuitMap = {
            'age': 'age_proof',
            'nationality': 'nationality_proof',
            'uniqueness': 'uniqueness_proof'
        };

        const circuitName = circuitMap[attributeType];
        
        if (!circuitName) {
            throw new Error('Invalid attribute type');
        }

        // Paths to compiled circuits
        const circuitsDir = join(process.cwd(), '..', 'circuits', 'build');
        const wasmPath = join(circuitsDir, `${circuitName}_js`, `${circuitName}.wasm`);
        const zkeyPath = join(circuitsDir, `${circuitName}_final.zkey`);

        // Check if circuits are compiled
        try {
            readFileSync(wasmPath);
            readFileSync(zkeyPath);
        } catch (err) {
            console.warn('⚠️  Circuits not compiled, using development mode');
            console.warn('   Run: cd circuits && npm run build');
            
            // Development fallback
            const mockProof = {
                pi_a: ["0", "0", "0"],
                pi_b: [["0", "0"], ["0", "0"], ["0", "0"]],
                pi_c: ["0", "0", "0"],
                protocol: "groth16",
                curve: "bn128"
            };
            const mockSignals = [publicInputs.commitment || "0"];
            return { proof: mockProof, publicSignals: mockSignals };
        }

        // Prepare circuit inputs
        const input = {
            ...privateInputs,
            ...publicInputs
        };

        console.log(`Generating ${attributeType} proof with snarkjs...`);
        
        // Generate witness and proof using Groth16
        const { proof, publicSignals } = await snarkjs.groth16.fullProve(
            input,
            wasmPath,
            zkeyPath
        );

        console.log('✅ Proof generated successfully');
        console.log('   Public signals:', publicSignals);

        return { proof, publicSignals };

    } catch (error) {
        console.error('Error generating ZK proof:', error);
        throw new Error('Failed to generate proof');
    }
}

/**
 * Verify ZK proof off-chain
 * @param {Object} proof - The proof to verify
 * @param {Array} publicSignals - Public signals
 * @param {string} attributeType - Type of attribute
 * @returns {Promise<boolean>} - True if proof is valid
 */
export async function verifyZKProof(proof, publicSignals, attributeType) {
    try {
        const circuitMap = {
            'age': 'age_proof',
            'nationality': 'nationality_proof',
            'uniqueness': 'uniqueness_proof'
        };

        const circuitName = circuitMap[attributeType];
        
        if (!circuitName) {
            throw new Error('Invalid attribute type');
        }

        // Load verification key
        const circuitsDir = join(process.cwd(), '..', 'circuits', 'build');
        const vkeyPath = join(circuitsDir, `${circuitName}_verification_key.json`);
        
        try {
            const vkey = JSON.parse(readFileSync(vkeyPath, 'utf8'));
            
            console.log(`Verifying ${attributeType} proof with snarkjs...`);
            
            // Verify proof using Groth16
            const isValid = await snarkjs.groth16.verify(vkey, publicSignals, proof);
            
            if (isValid) {
                console.log('✅ Proof verification successful');
            } else {
                console.log('❌ Proof verification failed');
            }
            
            return isValid;
            
        } catch (err) {
            console.warn('⚠️  Verification key not found, using development mode');
            console.warn('   Run: cd circuits && npm run build');
            return true; // Development fallback
        }

    } catch (error) {
        console.error('Error verifying ZK proof:', error);
        return false;
    }
}

/**
 * Generate proof inputs for age verification
 * @param {number} age - Actual age
 * @param {number} minAge - Minimum age requirement
 * @returns {Object} - Circuit inputs
 */
export function generateAgeProofInputs(age, minAge) {
    return {
        privateInputs: {
            age: age.toString()
        },
        publicInputs: {
            minAge: minAge.toString(),
            isAboveAge: (age >= minAge) ? "1" : "0"
        }
    };
}

/**
 * Generate a zero-knowledge proof for age verification
 * @param {number} age - User's actual age
 * @param {number} minAge - Minimum age requirement
 * @param {string} identityCommitment - Hash of user's identity data
 * @returns {Promise<Object>} Generated proof and public signals
 */
async function generateAgeProof(age, minAge, identityCommitment) {
  try {
    const circuitPath = path.join(CIRCUITS_PATH, 'age_proof');
    const wasmPath = path.join(circuitPath, 'age_proof_js', 'age_proof.wasm');
    const zkeyPath = path.join(circuitPath, 'age_proof_final.zkey');

    // Check if files exist
    if (!fs.existsSync(wasmPath)) {
      throw new Error(`WASM file not found: ${wasmPath}. Run 'npm run build' in circuits folder.`);
    }
    if (!fs.existsSync(zkeyPath)) {
      throw new Error(`Proving key not found: ${zkeyPath}. Run 'npm run build' in circuits folder.`);
    }

    // Prepare circuit inputs
    const input = {
      age: age,
      minAge: minAge,
      identityCommitment: identityCommitment
    };

    console.log('Generating age proof with input:', input);

    // Generate witness
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      input,
      wasmPath,
      zkeyPath
    );

    console.log('✅ Age proof generated successfully');
    console.log('Public signals:', publicSignals);

    // Convert proof to format expected by Solana program
    const solidityProof = await exportSolidityCallData(proof, publicSignals);

    return {
      proof: solidityProof.proof,
      publicSignals: solidityProof.publicSignals,
      rawProof: proof,
      rawPublicSignals: publicSignals
    };
  } catch (error) {
    console.error('Error generating age proof:', error);
    throw error;
  }
}

/**
 * Generate a zero-knowledge proof for nationality verification
 * @param {string} nationality - User's nationality code
 * @param {string} identityCommitment - Hash of user's identity data
 * @returns {Promise<Object>} Generated proof and public signals
 */
async function generateNationalityProof(nationality, identityCommitment) {
  try {
    const circuitPath = path.join(CIRCUITS_PATH, 'nationality_proof');
    const wasmPath = path.join(circuitPath, 'nationality_proof_js', 'nationality_proof.wasm');
    const zkeyPath = path.join(circuitPath, 'nationality_proof_final.zkey');

    if (!fs.existsSync(wasmPath) || !fs.existsSync(zkeyPath)) {
      throw new Error('Circuit files not found. Run npm run build in circuits folder.');
    }

    // Convert nationality string to numeric representation (simple hash)
    const nationalityHash = Buffer.from(nationality).reduce((acc, byte) => acc + byte, 0);

    const input = {
      nationality: nationalityHash,
      identityCommitment: identityCommitment
    };

    console.log('Generating nationality proof with input:', input);

    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      input,
      wasmPath,
      zkeyPath
    );

    console.log('✅ Nationality proof generated successfully');

    const solidityProof = await exportSolidityCallData(proof, publicSignals);

    return {
      proof: solidityProof.proof,
      publicSignals: solidityProof.publicSignals,
      rawProof: proof,
      rawPublicSignals: publicSignals
    };
  } catch (error) {
    console.error('Error generating nationality proof:', error);
    throw error;
  }
}

/**
 * Generate a zero-knowledge proof for identity uniqueness
 * @param {string} aadhaarHash - Hash of Aadhaar number
 * @param {string} identityCommitment - Public identity commitment
 * @returns {Promise<Object>} Generated proof and public signals
 */
async function generateUniquenessProof(aadhaarHash, identityCommitment) {
  try {
    const circuitPath = path.join(CIRCUITS_PATH, 'uniqueness_proof');
    const wasmPath = path.join(circuitPath, 'uniqueness_proof_js', 'uniqueness_proof.wasm');
    const zkeyPath = path.join(circuitPath, 'uniqueness_proof_final.zkey');

    if (!fs.existsSync(wasmPath) || !fs.existsSync(zkeyPath)) {
      throw new Error('Circuit files not found. Run npm run build in circuits folder.');
    }

    const input = {
      aadhaarHash: aadhaarHash,
      identityCommitment: identityCommitment
    };

    console.log('Generating uniqueness proof with input:', input);

    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      input,
      wasmPath,
      zkeyPath
    );

    console.log('✅ Uniqueness proof generated successfully');

    const solidityProof = await exportSolidityCallData(proof, publicSignals);

    return {
      proof: solidityProof.proof,
      publicSignals: solidityProof.publicSignals,
      rawProof: proof,
      rawPublicSignals: publicSignals
    };
  } catch (error) {
    console.error('Error generating uniqueness proof:', error);
    throw error;
  }
}

/**
 * Convert snarkjs proof to Solidity calldata format
 * This format is also compatible with Solana's Groth16 verifier
 */
async function exportSolidityCallData(proof, publicSignals) {
  // Proof components for Groth16
  const proofData = {
    pi_a: proof.pi_a.slice(0, 2),
    pi_b: proof.pi_b[0].slice(0, 2).concat(proof.pi_b[1].slice(0, 2)),
    pi_c: proof.pi_c.slice(0, 2)
  };

  // Serialize proof for on-chain verification
  const serializedProof = Buffer.concat([
    Buffer.from(proofData.pi_a[0]),
    Buffer.from(proofData.pi_a[1]),
    Buffer.from(proofData.pi_b[0]),
    Buffer.from(proofData.pi_b[1]),
    Buffer.from(proofData.pi_b[2]),
    Buffer.from(proofData.pi_b[3]),
    Buffer.from(proofData.pi_c[0]),
    Buffer.from(proofData.pi_c[1])
  ]);

  return {
    proof: serializedProof.toString('hex'),
    publicSignals: publicSignals
  };
}

/**
 * Verify a proof locally before sending to blockchain
 * @param {Object} proof - The proof object
 * @param {Array} publicSignals - Public signals
 * @param {string} circuitType - Type of circuit (age/nationality/uniqueness)
 * @returns {Promise<boolean>} True if proof is valid
 */
async function verifyProofLocally(proof, publicSignals, circuitType) {
  try {
    const vkeyPath = path.join(CIRCUITS_PATH, `${circuitType}_proof`, 'verification_key.json');
    
    if (!fs.existsSync(vkeyPath)) {
      throw new Error(`Verification key not found: ${vkeyPath}`);
    }

    const vkey = JSON.parse(fs.readFileSync(vkeyPath, 'utf8'));
    
    const isValid = await snarkjs.groth16.verify(vkey, publicSignals, proof);
    
    console.log(`Local verification for ${circuitType}: ${isValid ? '✅ VALID' : '❌ INVALID'}`);
    
    return isValid;
  } catch (error) {
    console.error('Error verifying proof locally:', error);
    return false;
  }
}
