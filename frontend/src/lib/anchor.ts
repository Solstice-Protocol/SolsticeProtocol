/**
 * Anchor Program utilities for Solstice Protocol
 */

import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { Connection, PublicKey, SystemProgram } from '@solana/web3.js';
import type { AnchorWallet } from '@solana/wallet-adapter-react';
import type { Contracts } from './idl';
import IDL_JSON from './idl.json';

/**
 * Create an Anchor provider from wallet and connection
 */
export function createProvider(
  wallet: AnchorWallet,
  connection: Connection
): AnchorProvider {
  return new AnchorProvider(
    connection,
    wallet,
    AnchorProvider.defaultOptions()
  );
}

/**
 * Get the Solstice Program instance
 */
export function getSolsticeProgram(
  provider: AnchorProvider
): Program<Contracts> {
  // Get program ID from IDL
  const programId = new PublicKey(IDL_JSON.address);
  
  // Create program - import JSON directly to avoid TypeScript type issues
  // Anchor needs the raw IDL object to generate methods dynamically
  const program = new Program(IDL_JSON as any, provider);
  
  // Debug: log program details
  console.log('🔍 Program ID from IDL:', programId.toString());
  console.log('🔍 Program ID from instance:', program.programId.toString());
  console.log('🔍 Program methods available:', program.methods ? 'YES' : 'NO');
  if (program.methods) {
    console.log('🔍 Available method names:', Object.keys(program.methods));
  }
  
  return program as unknown as Program<Contracts>;
}

/**
 * Derive PDA for the global registry account
 */
export function getRegistryPDA(programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('registry')],
    programId
  );
}

/**
 * Derive PDA for a user's identity account
 */
export function getIdentityPDA(
  userPublicKey: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('identity'), userPublicKey.toBuffer()],
    programId
  );
}

/**
 * Convert hex string to Uint8Array[32]
 */
export function hexToBytes32(hex: string): number[] {
  // Remove 0x prefix if present
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  
  // Pad to 64 chars (32 bytes)
  const paddedHex = cleanHex.padStart(64, '0');
  
  // Convert to byte array
  const bytes: number[] = [];
  for (let i = 0; i < paddedHex.length; i += 2) {
    bytes.push(parseInt(paddedHex.substr(i, 2), 16));
  }
  
  return bytes;
}

/**
 * Register a new identity on-chain (or update if exists)
 */
export async function registerIdentity(
  program: Program<Contracts>,
  userPublicKey: PublicKey,
  identityCommitment: string,
  merkleRoot: string
): Promise<string> {
  const programId = program.programId;
  const provider = program.provider as AnchorProvider;
  
  // Get PDAs
  const [registryPda] = getRegistryPDA(programId);
  const [identityPda] = getIdentityPDA(userPublicKey, programId);
  
  // Convert hex strings to byte arrays
  const commitmentBytes = hexToBytes32(identityCommitment);
  const merkleRootBytes = hexToBytes32(merkleRoot);
  
  console.log('🔍 Debug:', { commitmentBytes, merkleRootBytes });
  console.log('🔍 Registry PDA:', registryPda.toString());
  console.log('🔍 Identity PDA:', identityPda.toString());
  
  // Check if program.methods exists
  if (!program.methods) {
    throw new Error('Program methods not initialized. Check IDL and program connection.');
  }
  
  // Check if identity account already exists
  const accountInfo = await provider.connection.getAccountInfo(identityPda);
  const accountExists = accountInfo !== null;
  
  console.log('🔍 Identity account exists:', accountExists);
  
  if (accountExists) {
    // Read raw account data to check if update is needed
    const accountData = accountInfo!.data;
    
    // Identity account structure (from Rust):
    // - 8 bytes discriminator
    // - 32 bytes owner (pubkey)
    // - 32 bytes identity_commitment
    // - 32 bytes merkle_root
    // - 1 byte is_verified
    // - 8 bytes verification_timestamp
    // - 4 bytes attributes_verified
    // - 1 byte bump
    
    // Extract commitment (offset 40, length 32)
    const existingCommitment = accountData.slice(40, 72).toString('hex');
    // Extract merkle root (offset 72, length 32)
    const existingMerkleRoot = accountData.slice(72, 104).toString('hex');
    
    const newCommitment = identityCommitment.replace('0x', '').toLowerCase();
    const newMerkleRoot = merkleRoot.replace('0x', '').toLowerCase();
    
    console.log('🔍 Existing commitment:', existingCommitment);
    console.log('🔍 New commitment:', newCommitment);
    
    if (existingCommitment === newCommitment && existingMerkleRoot === newMerkleRoot) {
      console.log('✅ Identity data unchanged, skipping transaction');
      // Fetch the most recent transaction for this account
      const signatures = await provider.connection.getSignaturesForAddress(identityPda, { limit: 1 });
      const lastTx = signatures[0]?.signature || 'IDENTITY_UNCHANGED';
      console.log('📝 Using existing transaction:', lastTx);
      return lastTx;
    }
    
    console.log('🔄 Updating existing identity with new data...');
    // @ts-ignore - TypeScript doesn't know about camelCase conversion
    const tx = await program.methods
      .updateIdentity(commitmentBytes, merkleRootBytes)
      .accounts({
        identity: identityPda,
        user: userPublicKey,
      })
      .rpc({
        skipPreflight: false,
        commitment: 'confirmed',
      });
    
    console.log('✅ Identity updated:', tx);
    return tx;
  }
  
  console.log('🔍 Creating new identity...');
  
  // Log the program instance details
  console.log('🔍 Program instance:');
  console.log('   programId:', program.programId.toString());
  console.log('   provider:', program.provider.connection.rpcEndpoint);
  
  // Send transaction with fresh blockhash
  // @ts-ignore - Anchor generates camelCase methods at runtime despite type definitions
  const tx = await program.methods
    .registerIdentity(commitmentBytes, merkleRootBytes)
    .accounts({
      identity: identityPda,
      registry: registryPda,
      user: userPublicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc({
      skipPreflight: false,
      commitment: 'confirmed',
    });
  
  console.log('✅ Identity registered:', tx);
  return tx;
}

/**
 * Verify identity on-chain with a ZK proof
 */
export async function verifyIdentity(
  program: Program<Contracts>,
  userPublicKey: PublicKey,
  proof: any,
  publicInputs: any[],
  attributeType: 'age' | 'nationality' | 'uniqueness'
): Promise<string> {
  const programId = program.programId;
  
  // Get identity PDA
  const [identityPda] = getIdentityPDA(userPublicKey, programId);
  
  // Map attribute type to u8
  const attributeTypeMap: Record<string, number> = {
    age: 1,
    nationality: 2,
    uniqueness: 4,
  };
  
  const attributeTypeByte = attributeTypeMap[attributeType];
  
  // Serialize proof and public inputs
  const proofBytes = serializeProof(proof);
  const publicInputBytes = serializePublicInputs(publicInputs);
  
  // Send transaction - Anchor converts snake_case IDL names to camelCase methods
  // @ts-ignore - Anchor generates camelCase methods at runtime despite type definitions
  const tx = await program.methods
    .verifyIdentity(
      Array.from(proofBytes),
      Array.from(publicInputBytes),
      attributeTypeByte
    )
    .accounts({
      identity: identityPda,
      authority: userPublicKey,
    })
    .rpc();
  
  console.log('✅ Identity verified:', tx);
  return tx;
}

/**
 * Fetch identity account from on-chain
 */
export async function fetchIdentityAccount(
  program: Program<Contracts>,
  userPublicKey: PublicKey
) {
  const programId = program.programId;
  const [identityPda] = getIdentityPDA(userPublicKey, programId);
  
  try {
    // Fetch account info directly using the connection
    const accountInfo = await program.provider.connection.getAccountInfo(identityPda);
    
    if (!accountInfo) {
      console.log('Identity account not found');
      return null;
    }
    
    // Account exists, return basic info
    return {
      exists: true,
      address: identityPda.toString(),
      data: accountInfo.data
    };
  } catch (error) {
    console.log('Error fetching identity account:', error);
    return null;
  }
}

/**
 * Serialize Groth16 proof for Solana
 */
function serializeProof(_proof: any): Uint8Array {
  // Convert proof to bytes format expected by Solana program
  // This is a simplified version - adjust based on your groth16-solana implementation
  const buffer = Buffer.alloc(256); // Groth16 proofs are typically 256 bytes
  
  // Serialize pi_a (2 field elements)
  // Serialize pi_b (6 field elements)
  // Serialize pi_c (2 field elements)
  // Total: 10 field elements * 32 bytes = 320 bytes (compressed to 256)
  
  // For now, return a placeholder - implement actual serialization based on groth16-solana
  console.warn('⚠️  Proof serialization needs proper implementation');
  return new Uint8Array(buffer);
}

/**
 * Serialize public inputs for Solana
 */
function serializePublicInputs(publicInputs: any[]): Uint8Array {
  // Convert public inputs to bytes
  const buffers = publicInputs.map((input) => {
    const hex = typeof input === 'string' ? input : input.toString(16);
    return Buffer.from(hexToBytes32(hex));
  });
  
  return Buffer.concat(buffers);
}
