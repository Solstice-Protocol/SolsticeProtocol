/**
 * Browser-based ZK Proof Generator
 * Generates Groth16 proofs locally using snarkjs
 * All proof generation happens client-side for privacy
 */

// @ts-ignore
import * as snarkjs from 'snarkjs';
// @ts-ignore
import { buildPoseidon } from 'circomlibjs';

// Circuit artifact paths (loaded from public directory)
const CIRCUITS = {
  age: {
    wasm: '/circuits/age_proof_js/age_proof.wasm',
    zkey: '/circuits/age_proof_final.zkey',
    vkey: '/circuits/age_proof_verification_key.json'
  },
  nationality: {
    wasm: '/circuits/nationality_proof_js/nationality_proof.wasm',
    zkey: '/circuits/nationality_proof_final.zkey',
    vkey: '/circuits/nationality_proof_verification_key.json'
  },
  uniqueness: {
    wasm: '/circuits/uniqueness_proof_js/uniqueness_proof.wasm',
    zkey: '/circuits/uniqueness_proof_final.zkey',
    vkey: '/circuits/uniqueness_proof_verification_key.json'
  }
};

export interface ProofData {
  proof: any;
  publicSignals: string[];
  attributeType: string;
}

/**
 * Generate age proof (proves age > threshold without revealing exact age)
 */
export async function generateAgeProof(
  dateOfBirth: string, // DD/MM/YYYY format from Aadhaar or YYYYMMDD
  ageThreshold: number = 18,
  nonce: string
): Promise<ProofData> {
  console.log(' Generating age proof...');
  console.log('   DOB:', dateOfBirth, 'Threshold:', ageThreshold);
  
  try {
    let birthDate: Date;
    
    // Handle both DD/MM/YYYY and YYYYMMDD formats
    if (dateOfBirth.includes('/')) {
      // DD/MM/YYYY format
      const [day, month, year] = dateOfBirth.split('/').map(Number);
      birthDate = new Date(year, month - 1, day);
    } else if (dateOfBirth.length === 8) {
      // YYYYMMDD format
      const year = parseInt(dateOfBirth.substring(0, 4));
      const month = parseInt(dateOfBirth.substring(4, 6));
      const day = parseInt(dateOfBirth.substring(6, 8));
      birthDate = new Date(year, month - 1, day);
    } else {
      throw new Error('Invalid date format. Expected DD/MM/YYYY or YYYYMMDD');
    }
    
    const currentDate = new Date();
    
    // Calculate age
    let age = currentDate.getFullYear() - birthDate.getFullYear();
    const monthDiff = currentDate.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && currentDate.getDate() < birthDate.getDate())) {
      age--;
    }
    
    // Validate age is reasonable
    if (isNaN(age) || age < 0 || age > 150) {
      throw new Error(`Invalid age calculated: ${age}. Check DOB: ${dateOfBirth}`);
    }
    
    console.log('   Calculated age:', age);
    
    // Check if above threshold
    const isAboveAge = age >= ageThreshold ? 1 : 0;
    
    // Simple commitment hash (in production, use proper Poseidon hash)
    const commitmentHash = BigInt(nonce) % BigInt(2**32);
    
    const input = {
      minAge: ageThreshold,
      isAboveAge: isAboveAge,
      commitmentHash: commitmentHash.toString(),
      age: age,
      identitySecret: nonce
    };
    
    console.log('   Input:', { minAge: ageThreshold, age, isAboveAge });
    console.log('   Generating proof (this may take 2-5 seconds)...');
    
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      input,
      CIRCUITS.age.wasm,
      CIRCUITS.age.zkey
    );
    
    console.log('Age proof generated!');
    console.log('   Proof size:', JSON.stringify(proof).length, 'bytes');
    
    return {
      proof,
      publicSignals,
      attributeType: 'age'
    };
  } catch (error) {
    console.error('Failed to generate age proof:', error);
    throw new Error('Age proof generation failed');
  }
}

/**
 * Generate nationality proof (proves nationality without revealing other data)
 */
export async function generateNationalityProof(
  nationality: string, // e.g., 'IN' for India
  allowedNationality: string,
  nonce: string
): Promise<ProofData> {
  console.log(' Generating nationality proof...');
  console.log('   Nationality:', nationality, 'Allowed:', allowedNationality);
  
  try {
    // Convert country codes to numbers (e.g., IN = 91 for India phone code)
    const countryCodeMap: { [key: string]: number } = {
      'IN': 91, // India
      'US': 1,  // United States
      'UK': 44, // United Kingdom
      'CN': 86, // China
      'JP': 81, // Japan
    };
    
    const countryCode = countryCodeMap[nationality] || 91; // Default to India
    const allowedCountryCode = countryCodeMap[allowedNationality] || 91;
    
    // Check if nationality matches
    const isFromCountry = countryCode === allowedCountryCode ? 1 : 0;
    
    // Simple commitment hash
    const commitmentHash = BigInt(nonce) % BigInt(2**32);
    
    const input = {
      allowedCountry: allowedCountryCode,
      isFromCountry: isFromCountry,
      commitmentHash: commitmentHash.toString(),
      countryCode: countryCode,
      identitySecret: nonce
    };
    
    console.log('   Input:', { allowedCountry: allowedCountryCode, countryCode, isFromCountry });
    console.log('   Generating proof (this may take 1-3 seconds)...');
    
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      input,
      CIRCUITS.nationality.wasm,
      CIRCUITS.nationality.zkey
    );
    
    console.log('Nationality proof generated!');
    console.log('   Proof size:', JSON.stringify(proof).length, 'bytes');
    
    return {
      proof,
      publicSignals,
      attributeType: 'nationality'
    };
  } catch (error) {
    console.error('Failed to generate nationality proof:', error);
    throw new Error('Nationality proof generation failed');
  }
}

/**
 * Generate uniqueness proof (proves user is unique without revealing identity)
 */
export async function generateUniquenessProof(
  aadhaarNumber: string,
  nonce: string
): Promise<ProofData> {
  console.log(' Generating uniqueness proof...');
  console.log('   Aadhaar (masked):', aadhaarNumber.slice(-4));
  
  try {
    // Build Poseidon hash function
    const poseidon = await buildPoseidon();
    
    // Convert Aadhaar string to numeric hash
    let aadhaarHash = 0;
    for (let i = 0; i < aadhaarNumber.length; i++) {
      const char = aadhaarNumber.charCodeAt(i);
      aadhaarHash = ((aadhaarHash << 5) - aadhaarHash) + char;
      aadhaarHash = aadhaarHash & aadhaarHash; // Convert to 32-bit integer
    }
    aadhaarHash = Math.abs(aadhaarHash);
    
    // Convert nonce to identity secret (numeric)
    const identitySecret = Math.abs(parseInt(nonce.substring(0, 10))) % (2**31);
    
    // Generate nullifier using Poseidon hash (matches circuit)
    const nullifierHash = poseidon([identitySecret, aadhaarHash]);
    const nullifier = poseidon.F.toObject(nullifierHash);
    
    // Simplified merkle root (in production, would be from actual merkle tree)
    const merkleRoot = (identitySecret + aadhaarHash) % (2**31);
    
    const input = {
      nullifier: nullifier.toString(),
      merkleRoot: merkleRoot.toString(),
      identitySecret: identitySecret.toString(),
      aadhaarHash: aadhaarHash.toString()
    };
    
    console.log('   Input:', { 
      nullifier: nullifier.toString().substring(0, 20) + '...', 
      aadhaarHash,
      identitySecret 
    });
    console.log('   Generating proof (this may take <1 second)...');
    
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      input,
      CIRCUITS.uniqueness.wasm,
      CIRCUITS.uniqueness.zkey
    );
    
    console.log('Uniqueness proof generated!');
    console.log('   Proof size:', JSON.stringify(proof).length, 'bytes');
    
    return {
      proof,
      publicSignals,
      attributeType: 'uniqueness'
    };
  } catch (error) {
    console.error('Failed to generate uniqueness proof:', error);
    throw new Error('Uniqueness proof generation failed');
  }
}

/**
 * Generate all proofs at once (age + nationality + uniqueness)
 * This is called automatically after QR scan
 */
export async function generateAllProofs(
  identityData: {
    dateOfBirth: string;    // YYYYMMDD
    nationality: string;     // e.g., "IN"
    aadhaarNumber: string;   // 12-digit
    nonce: string;           // Random nonce from commitment
  },
  config: {
    ageThreshold?: number;
    allowedNationality?: string;
  } = {}
): Promise<{
  ageProof: ProofData | null;
  nationalityProof: ProofData | null;
  uniquenessProof: ProofData | null;
  errors: string[];
}> {
  console.log('Auto-generating all ZK proofs...');
  
  const results = {
    ageProof: null as ProofData | null,
    nationalityProof: null as ProofData | null,
    uniquenessProof: null as ProofData | null,
    errors: [] as string[]
  };
  
  // Generate proofs in parallel for speed
  const proofPromises = [];
  
  // Age proof
  proofPromises.push(
    generateAgeProof(
      identityData.dateOfBirth,
      config.ageThreshold || 18,
      identityData.nonce
    )
      .then(proof => { results.ageProof = proof; })
      .catch(err => { results.errors.push(`Age proof: ${err.message}`); })
  );
  
  // Nationality proof
  if (config.allowedNationality) {
    proofPromises.push(
      generateNationalityProof(
        identityData.nationality,
        config.allowedNationality,
        identityData.nonce
      )
        .then(proof => { results.nationalityProof = proof; })
        .catch(err => { results.errors.push(`Nationality proof: ${err.message}`); })
    );
  }
  
  // Uniqueness proof
  proofPromises.push(
    generateUniquenessProof(
      identityData.aadhaarNumber,
      identityData.nonce
    )
      .then(proof => { results.uniquenessProof = proof; })
      .catch(err => { results.errors.push(`Uniqueness proof: ${err.message}`); })
  );
  
  // Wait for all proofs
  await Promise.all(proofPromises);
  
  const successCount = [
    results.ageProof,
    results.nationalityProof,
    results.uniquenessProof
  ].filter(Boolean).length;
  
  console.log(`Generated ${successCount} proofs successfully`);
  if (results.errors.length > 0) {
    console.warn('Some proofs failed:', results.errors);
  }
  
  return results;
}

/**
 * Verify proof locally before submitting on-chain
 */
export async function verifyProofLocally(
  proof: any,
  publicSignals: string[],
  attributeType: 'age' | 'nationality' | 'uniqueness'
): Promise<boolean> {
  try {
    const vkeyResponse = await fetch(CIRCUITS[attributeType].vkey);
    const vkey = await vkeyResponse.json();
    
    const isValid = await snarkjs.groth16.verify(vkey, publicSignals, proof);
    
    console.log(`${isValid ? '' : ''} ${attributeType} proof verification:`, isValid);
    
    return isValid;
  } catch (error) {
    console.error('Proof verification failed:', error);
    return false;
  }
}

/**
 * Store proofs in localStorage for reuse
 */
export function storeProofs(walletAddress: string, proofs: {
  age?: ProofData;
  nationality?: ProofData;
  uniqueness?: ProofData;
}) {
  // Store in IndexedDB for better capacity and persistence
  const request = indexedDB.open('SolsticeProofs', 1);
  
  request.onupgradeneeded = (event: any) => {
    const db = event.target.result;
    if (!db.objectStoreNames.contains('proofs')) {
      db.createObjectStore('proofs', { keyPath: 'type' });
    }
  };
  
  request.onsuccess = (event: any) => {
    const db = event.target.result;
    const transaction = db.transaction(['proofs'], 'readwrite');
    const store = transaction.objectStore('proofs');
    const timestamp = Date.now();
    const expiresAt = timestamp + (7 * 24 * 60 * 60 * 1000); // 7 days
    
    // Store each proof separately
    if (proofs.age) {
      store.put({
        type: 'age',
        status: 'valid',
        generatedAt: timestamp,
        expiresAt,
        proof: proofs.age.proof,
        publicSignals: proofs.age.publicSignals,
        walletAddress,
      });
    }
    
    if (proofs.nationality) {
      store.put({
        type: 'nationality',
        status: 'valid',
        generatedAt: timestamp,
        expiresAt,
        proof: proofs.nationality.proof,
        publicSignals: proofs.nationality.publicSignals,
        walletAddress,
      });
    }
    
    if (proofs.uniqueness) {
      store.put({
        type: 'uniqueness',
        status: 'valid',
        generatedAt: timestamp,
        expiresAt,
        proof: proofs.uniqueness.proof,
        publicSignals: proofs.uniqueness.publicSignals,
        walletAddress,
      });
    }
    
    transaction.oncomplete = () => {
      console.log('💾 Proofs stored in IndexedDB');
    };
  };
  
  request.onerror = () => {
    console.error('Failed to store proofs in IndexedDB');
  };
}

/**
 * Retrieve stored proofs
 */
export async function getStoredProofs(walletAddress?: string): Promise<{
  age?: ProofData;
  nationality?: ProofData;
  uniqueness?: ProofData;
}> {
  return new Promise((resolve) => {
    const request = indexedDB.open('SolsticeProofs', 1);
    
    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('proofs')) {
        db.createObjectStore('proofs', { keyPath: 'type' });
      }
    };
    
    request.onsuccess = (event: any) => {
      const db = event.target.result;
      const transaction = db.transaction(['proofs'], 'readonly');
      const store = transaction.objectStore('proofs');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => {
        const allProofs = getAllRequest.result || [];
        const now = Date.now();
        
        // Filter by wallet address if provided and check expiration
        const validProofs = allProofs.filter((p: any) => {
          const matchesWallet = !walletAddress || p.walletAddress === walletAddress;
          const notExpired = !p.expiresAt || p.expiresAt > now;
          return matchesWallet && notExpired;
        });
        
        // Convert to expected format
        const result: any = {};
        validProofs.forEach((p: any) => {
          result[p.type] = {
            proof: p.proof,
            publicSignals: p.publicSignals,
          };
        });
        
        resolve(result);
      };
      
      getAllRequest.onerror = () => {
        resolve({});
      };
    };
    
    request.onerror = () => {
      resolve({});
    };
  });
}
