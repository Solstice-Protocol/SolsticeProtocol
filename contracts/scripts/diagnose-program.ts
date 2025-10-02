/**
 * Diagnostic script to debug the InstructionFallbackNotFound error
 */

import { Connection, PublicKey } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';

const DEVNET_RPC = 'https://api.devnet.solana.com';
const PROGRAM_ID = 'ELqNcvWpY4L5qAe7P4PuEKMo86zrouKctZF3KuSysuYY';

// Load IDL
const IDL = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../frontend/src/lib/idl.json'), 'utf-8')
);

async function main() {
  console.log('Debugging InstructionFallbackNotFound error\n');

  const connection = new Connection(DEVNET_RPC, 'confirmed');
  const programId = new PublicKey(PROGRAM_ID);

  // Get program account to verify it exists
  console.log('📍 Program ID:', PROGRAM_ID);
  const programAccount = await connection.getAccountInfo(programId);
  
  if (!programAccount) {
    console.error('Program not found on devnet!');
    process.exit(1);
  }

  console.log('Program exists');
  console.log('   Owner:', programAccount.owner.toString());
  console.log('   Executable:', programAccount.executable);
  console.log('   Data length:', programAccount.data.length, 'bytes');

  // Check program data account (for upgradeable programs)
  const [programDataAddress] = PublicKey.findProgramAddressSync(
    [programId.toBuffer()],
    new PublicKey('BPFLoaderUpgradeab1e11111111111111111111111')
  );

  console.log('\n📍 Program Data Address:', programDataAddress.toString());
  const programData = await connection.getAccountInfo(programDataAddress);
  
  if (programData) {
    console.log('Program Data exists');
    console.log('   Data length:', programData.data.length, 'bytes');
  }

  // Check registry PDA
  const [registryPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('registry')],
    programId
  );

  console.log('\n📍 Registry PDA:', registryPda.toString());
  const registryAccount = await connection.getAccountInfo(registryPda);
  
  if (!registryAccount) {
    console.error('Registry not initialized!');
    process.exit(1);
  }

  console.log('Registry exists');
  console.log('   Owner:', registryAccount.owner.toString());
  console.log('   Data length:', registryAccount.data.length, 'bytes');
  console.log('   Data (hex):', registryAccount.data.toString('hex'));

  // Analyze IDL
  console.log('\nIDL Analysis:');
  console.log('   Address:', IDL.address);
  console.log('   Name:', IDL.metadata.name);
  console.log('   Version:', IDL.metadata.version);
  console.log('   Spec:', IDL.metadata.spec);
  
  console.log('\n   Instructions:');
  IDL.instructions.forEach((ix: any) => {
    console.log(`   - ${ix.name}`);
    console.log(`     Discriminator: [${ix.discriminator.join(', ')}]`);
    console.log(`     Accounts: ${ix.accounts.length}`);
    ix.accounts.forEach((acc: any) => {
      const flags = [];
      if (acc.writable) flags.push('writable');
      if (acc.signer) flags.push('signer');
      console.log(`       - ${acc.name}${flags.length ? ` (${flags.join(', ')})` : ''}`);
    });
  });

  // Get recent transactions to the program
  console.log('\n📜 Recent program transactions:');
  const signatures = await connection.getSignaturesForAddress(programId, { limit: 5 });
  
  for (const sig of signatures) {
    console.log(`\n   Signature: ${sig.signature.slice(0, 20)}...`);
    console.log(`   Slot: ${sig.slot}`);
    console.log(`   Status: ${sig.err ? 'Error' : 'Success'}`);
    
    if (sig.err) {
      const tx = await connection.getTransaction(sig.signature, {
        maxSupportedTransactionVersion: 0,
      });
      
      if (tx && tx.meta && tx.meta.logMessages) {
        console.log('   Logs:');
        tx.meta.logMessages.slice(0, 10).forEach(log => {
          console.log(`     ${log}`);
        });
      }
    }
  }

  console.log('\nDiagnostic complete');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
