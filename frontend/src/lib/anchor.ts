/**
 * Anchor Program utilities for Solstice Protocol
 */

import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { Connection, PublicKey, SystemProgram } from '@solana/web3.js';
import type { AnchorWallet } from '@solana/wallet-adapter-react';
import { IDL, type Contracts } from './idl';
import { config } from '../config';

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
  const programId = new PublicKey(config.programId);
  return new Program<Contracts>(IDL, programId, provider);
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
 * Register a new identity on-chain
 */
export async function registerIdentity(
  program: Program<Contracts>,
  userPublicKey: PublicKey,
  identityCommitment: string,
  merkleRoot: string
): Promise<string> {
  const programId = program.programId;
  
  // Get PDAs
  const [registryPda] = getRegistryPDA(programId);
  const [identityPda] = getIdentityPDA(userPublicKey, programId);
  
  // Convert hex strings to byte arrays
  const commitmentBytes = hexToBytes32(identityCommitment);
  const merkleRootBytes = hexToBytes32(merkleRoot);
  
  // Send transaction
  const tx = await program.methods
    .registerIdentity(commitmentBytes, merkleRootBytes)
    .accounts({
      identity: identityPda,
      registry: registryPda,
      user: userPublicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  
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
  
  // Send transaction
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
    const account = await program.account.identity.fetch(identityPda);
    return account;
  } catch (error) {
    console.log('Identity account not found');
    return null;
  }
}

/**
 * Serialize Groth16 proof for Solana
 */
function serializeProof(proof: any): Uint8Array {
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
