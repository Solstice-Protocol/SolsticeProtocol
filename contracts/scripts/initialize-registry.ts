/**
 * Initialize the Solstice Protocol registry on devnet
 */

import { Program, AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { Connection, Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';

// Load IDL
const IDL = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../frontend/src/lib/idl.json'), 'utf-8')
);

// Configuration
const DEVNET_RPC = 'https://api.devnet.solana.com';
const PROGRAM_ID = 'ELqNcvWpY4L5qAe7P4PuEKMo86zrouKctZF3KuSysuYY';
const KEYPAIR_PATH = process.env.HOME + '/.config/solana/id.json';

async function main() {
  console.log('Initializing Solstice Protocol Registry on Devnet\n');

  // Load wallet
  const keypairData = JSON.parse(fs.readFileSync(KEYPAIR_PATH, 'utf-8'));
  const keypair = Keypair.fromSecretKey(new Uint8Array(keypairData));
  
  console.log('📍 Authority:', keypair.publicKey.toString());
  console.log('📍 Program ID:', PROGRAM_ID);

  // Setup connection and provider
  const connection = new Connection(DEVNET_RPC, 'confirmed');
  const wallet = new Wallet(keypair);
  const provider = new AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
  });

  // Create program instance
  const programId = new PublicKey(PROGRAM_ID);
  const program = new Program(IDL as any, provider);

  console.log('\nProgram methods:', Object.keys(program.methods));

  // Derive registry PDA
  const [registryPda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from('registry')],
    programId
  );

  console.log('\n📍 Registry PDA:', registryPda.toString());
  console.log('📍 Bump:', bump);

  // Check if registry already exists
  try {
    const accountInfo = await connection.getAccountInfo(registryPda);
    if (accountInfo) {
      console.log('\nRegistry already initialized!');
      console.log('   Owner:', accountInfo.owner.toString());
      console.log('   Data length:', accountInfo.data.length, 'bytes');
      return;
    }
  } catch (err) {
    // Account doesn't exist, continue with initialization
  }

  console.log('\nInitializing registry...');

  try {
    // @ts-ignore - Anchor generates camelCase methods
    const tx = await program.methods
      .initialize()
      .accounts({
        registry: registryPda,
        authority: keypair.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log('\nRegistry initialized successfully!');
    console.log('   Transaction:', tx);
    console.log('   View on Solscan:', `https://solscan.io/tx/${tx}?cluster=devnet`);
  } catch (error: any) {
    console.error('\nError initializing registry:');
    console.error(error);
    if (error.logs) {
      console.error('\nProgram logs:');
      error.logs.forEach((log: string) => console.error('  ', log));
    }
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
