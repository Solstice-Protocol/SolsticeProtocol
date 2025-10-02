import * as crypto from 'crypto';

function calculateDiscriminator(namespace: string, name: string): number[] {
  const preimage = `${namespace}:${name}`;
  const hash = crypto.createHash('sha256').update(preimage).digest();
  return Array.from(hash.slice(0, 8));
}

console.log('Calculating discriminators...\n');

console.log('initialize:');
console.log('  Calculated:', calculateDiscriminator('global', 'initialize'));
console.log('  Expected:  ', [175, 175, 109, 31, 13, 152, 155, 237]);

console.log('\nregister_identity:');
console.log('  Calculated:', calculateDiscriminator('global', 'register_identity'));
console.log('  Expected:  ', [137, 53, 72, 142, 84, 176, 164, 242]);

console.log('\nverify_identity:');
console.log('  Calculated:', calculateDiscriminator('global', 'verify_identity'));
console.log('  Expected:  ', [82, 236, 147, 198, 191, 178, 69, 30]);
