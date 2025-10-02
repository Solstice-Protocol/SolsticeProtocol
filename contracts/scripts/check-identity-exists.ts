import { Connection, PublicKey } from '@solana/web3.js';

const PROGRAM_ID = new PublicKey('ELqNcvWpY4L5qAe7P4PuEKMo86zrouKctZF3KuSysuYY');
const USER_PUBKEY = new PublicKey('E6tTqmeQZie9wTE6vmRKFSJi1TvLCjuXC1ZnSi2BwQhZ');

async function main() {
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  
  console.log('👤 Checking identity for user:', USER_PUBKEY.toString());
  
  const [identityPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('identity'), USER_PUBKEY.toBuffer()],
    PROGRAM_ID
  );
  
  console.log('🔍 Identity PDA:', identityPda.toString());
  
  const accountInfo = await connection.getAccountInfo(identityPda);
  
  if (accountInfo) {
    console.log('✅ Identity account ALREADY EXISTS!');
    console.log('   Owner:', accountInfo.owner.toString());
    console.log('   Data length:', accountInfo.data.length, 'bytes');
    console.log('   Lamports:', accountInfo.lamports);
    console.log('\n⚠️  Account already exists! Need to use update or close+recreate.');
    
    // Show account data
    console.log('\nAccount data (hex):');
    console.log(accountInfo.data.toString('hex').slice(0, 200) + '...');
  } else {
    console.log('❌ Identity account does NOT exist (ready for init)');
  }
}

main().catch(console.error);
