# Solstice Protocol ZK Circuits

This directory contains the zero-knowledge circuits for the Solstice Protocol identity verification system.

## Circuits

### 1. Age Proof (`age_proof.circom`)
Proves that a user is above a certain age without revealing their exact age.
- **Constraints**: ~50,000
- **Use Case**: Age-restricted dApps, KYC compliance

### 2. Nationality Proof (`nationality_proof.circom`)
Verifies a user's nationality without exposing other personal information.
- **Constraints**: ~10,000
- **Use Case**: Geographic restrictions, regulatory compliance

### 3. Uniqueness Proof (`uniqueness_proof.circom`)
Proves a user has a unique identity to prevent Sybil attacks.
- **Constraints**: ~10,000
- **Use Case**: One-person-one-account, fair token distribution

## Setup

### Prerequisites
```bash
# Install Circom
curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh
git clone https://github.com/iden3/circom.git
cd circom
cargo build --release
cargo install --path circom

# Install dependencies
npm install
```

### Download Powers of Tau
```bash
npm run powers-of-tau
```

## Compilation

### Compile all circuits
```bash
npm run compile:all
```

### Compile individual circuit
```bash
npm run compile:age
npm run compile:nationality
npm run compile:uniqueness
```

This generates:
- `.r1cs` - Rank-1 Constraint System
- `.wasm` - WebAssembly for witness generation
- `.sym` - Symbol file for debugging

## Trusted Setup

### Generate proving and verification keys
```bash
# Setup (for each circuit)
npm run setup:age

# Contribute to ceremony (adds randomness)
npm run setup:contribute

# Export verification key
npm run setup:export
```

## Testing

### Test age proof
```bash
npm run test:age
```

### Generate proof manually
```bash
cd build

# Create input
echo '{"age": "25", "minAge": "18", "isAboveAge": "1", "identitySecret": "12345", "commitmentHash": "0"}' > input.json

# Generate witness
node age_proof_js/generate_witness.js age_proof_js/age_proof.wasm input.json witness.wtns

# Generate proof
snarkjs groth16 prove age_proof_final.zkey witness.wtns proof.json public.json

# Verify proof
snarkjs groth16 verify age_proof_verification_key.json public.json proof.json
```

## Integration

The compiled circuits and keys are used by:
- **Backend**: Generates proofs off-chain
- **Smart Contracts**: Verifies proofs on-chain (Groth16 verifier)

## Circuit Optimization

To reduce constraints and improve performance:

1. **Minimize operations**: Reduce multiplications
2. **Use efficient libraries**: circomlib provides optimized components
3. **Profile circuits**: `circom --inspect` to analyze constraints
4. **Batch operations**: Combine multiple proofs when possible

## Security Considerations

- **Trusted Setup**: The Powers of Tau ceremony must be secure
- **Input Validation**: Ensure inputs are within expected ranges
- **Circuit Auditing**: Have circuits professionally audited
- **Key Management**: Protect proving and verification keys

## Production Checklist

- [ ] Conduct multi-party trusted setup ceremony
- [ ] Professional security audit of all circuits
- [ ] Optimize constraint counts for each circuit
- [ ] Generate production verification keys
- [ ] Implement circuit versioning
- [ ] Set up monitoring for proof generation failures
- [ ] Document expected constraint counts and proving times

## Resources

- [Circom Documentation](https://docs.circom.io/)
- [SnarkJS Guide](https://github.com/iden3/snarkjs)
- [Circomlib](https://github.com/iden3/circomlib)
- [ZK Learning Resources](https://zkp.science/)
