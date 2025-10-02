use anchor_lang::prelude::*;
use groth16_solana::groth16::{Groth16Verifier, Groth16Verifyingkey};

// Import verification keys from separate module
use crate::verification_keys::*;

/// Verify a Groth16 proof using BPF-optimized groth16-solana library
/// 
/// # Arguments
/// * `proof` - Serialized Groth16 proof (256 bytes: 64 bytes A, 128 bytes B, 64 bytes C)
/// * `public_inputs` - Public signals/inputs as field elements (32 bytes each)
/// * `attribute_type` - Type of attribute being verified (1=age, 2=nationality, 4=uniqueness)
/// 
/// # Returns
/// * `Result<bool>` - True if proof is valid, error otherwise
pub fn verify_groth16_proof(
    proof_bytes: &[u8],
    public_inputs_bytes: &[u8],
    attribute_type: u8,
) -> Result<bool> {
    // Select verification key based on attribute type
    let vk_struct = match attribute_type {
        1 => &AGE_PROOF_VK,
        2 => &NATIONALITY_PROOF_VK,
        4 => &UNIQUENESS_PROOF_VK,
        _ => return Err(error!(crate::errors::ErrorCode::InvalidPublicInputs)),
    };

    msg!("Verifying Groth16 proof for attribute type: {}", attribute_type);
    
    // Validate input lengths
    require!(proof_bytes.len() == 256, crate::errors::ErrorCode::InvalidProof);
    require!(!public_inputs_bytes.is_empty(), crate::errors::ErrorCode::InvalidPublicInputs);
    require!(public_inputs_bytes.len() % 32 == 0, crate::errors::ErrorCode::InvalidPublicInputs);
    
    let num_inputs = public_inputs_bytes.len() / 32;
    
    // Split proof into A, B, C components
    let proof_a: &[u8; 64] = proof_bytes[0..64].try_into()
        .map_err(|_| error!(crate::errors::ErrorCode::InvalidProof))?;
    let proof_b: &[u8; 128] = proof_bytes[64..192].try_into()
        .map_err(|_| error!(crate::errors::ErrorCode::InvalidProof))?;
    let proof_c: &[u8; 64] = proof_bytes[192..256].try_into()
        .map_err(|_| error!(crate::errors::ErrorCode::InvalidProof))?;
    
    // Prepare verification key
    let (alpha_g1, beta_g2, gamma_g2, delta_g2, ic_points) = prepare_verification_key(vk_struct);
    
    let vk = Groth16Verifyingkey {
        nr_pubinputs: num_inputs,
        vk_alpha_g1: alpha_g1,
        vk_beta_g2: beta_g2,
        vk_gamme_g2: gamma_g2,
        vk_delta_g2: delta_g2,
        vk_ic: &ic_points,
    };
    
    // Dynamic dispatch based on number of inputs (we'll support up to 10 inputs)
    let is_valid = match num_inputs {
        1 => verify_with_inputs::<1>(proof_a, proof_b, proof_c, public_inputs_bytes, &vk)?,
        2 => verify_with_inputs::<2>(proof_a, proof_b, proof_c, public_inputs_bytes, &vk)?,
        3 => verify_with_inputs::<3>(proof_a, proof_b, proof_c, public_inputs_bytes, &vk)?,
        4 => verify_with_inputs::<4>(proof_a, proof_b, proof_c, public_inputs_bytes, &vk)?,
        5 => verify_with_inputs::<5>(proof_a, proof_b, proof_c, public_inputs_bytes, &vk)?,
        _ => return Err(error!(crate::errors::ErrorCode::InvalidPublicInputs)),
    };
    
    if is_valid {
        msg!("  Groth16 proof verification successful");
    } else {
        msg!("❌ Groth16 proof verification failed");
        return Err(error!(crate::errors::ErrorCode::ProofVerificationFailed));
    }
    
    Ok(is_valid)
}

/// Helper function to verify with specific number of inputs (compile-time constant)
fn verify_with_inputs<const N: usize>(
    proof_a: &[u8; 64],
    proof_b: &[u8; 128],
    proof_c: &[u8; 64],
    public_inputs_bytes: &[u8],
    vk: &Groth16Verifyingkey,
) -> Result<bool> {
    // Convert public inputs to fixed-size array
    let mut public_inputs = [[0u8; 32]; N];
    for i in 0..N {
        let start = i * 32;
        let end = start + 32;
        public_inputs[i].copy_from_slice(&public_inputs_bytes[start..end]);
    }
    
    let mut verifier = Groth16Verifier::<N>::new(
        proof_a,
        proof_b,
        proof_c,
        &public_inputs,
        vk,
    ).map_err(|_| error!(crate::errors::ErrorCode::InvalidProof))?;
    
    // verify() returns Result<(), Error> - success means proof is valid
    verifier.verify()
        .map_err(|_| error!(crate::errors::ErrorCode::ProofVerificationFailed))?;
    
    Ok(true)
}

/// Convert verification key to format expected by groth16-solana
fn prepare_verification_key(vk: &VerificationKey) -> ([u8; 64], [u8; 128], [u8; 128], [u8; 128], Vec<[u8; 64]>) {
    // alpha_g1: 2 * 32 bytes = 64 bytes
    let mut alpha_g1 = [0u8; 64];
    alpha_g1[..32].copy_from_slice(&vk.alpha_g1[0]);
    alpha_g1[32..].copy_from_slice(&vk.alpha_g1[1]);
    
    // beta_g2: 4 * 32 bytes = 128 bytes
    let mut beta_g2 = [0u8; 128];
    beta_g2[0..32].copy_from_slice(&vk.beta_g2[0]);
    beta_g2[32..64].copy_from_slice(&vk.beta_g2[1]);
    beta_g2[64..96].copy_from_slice(&vk.beta_g2[2]);
    beta_g2[96..128].copy_from_slice(&vk.beta_g2[3]);
    
    // gamma_g2: 4 * 32 bytes = 128 bytes
    let mut gamma_g2 = [0u8; 128];
    gamma_g2[0..32].copy_from_slice(&vk.gamma_g2[0]);
    gamma_g2[32..64].copy_from_slice(&vk.gamma_g2[1]);
    gamma_g2[64..96].copy_from_slice(&vk.gamma_g2[2]);
    gamma_g2[96..128].copy_from_slice(&vk.gamma_g2[3]);
    
    // delta_g2: 4 * 32 bytes = 128 bytes
    let mut delta_g2 = [0u8; 128];
    delta_g2[0..32].copy_from_slice(&vk.delta_g2[0]);
    delta_g2[32..64].copy_from_slice(&vk.delta_g2[1]);
    delta_g2[64..96].copy_from_slice(&vk.delta_g2[2]);
    delta_g2[96..128].copy_from_slice(&vk.delta_g2[3]);
    
    // IC points: each is 2 * 32 bytes = 64 bytes
    let mut ic_points = Vec::with_capacity(vk.ic.len());
    for ic_point in vk.ic {
        let mut point = [0u8; 64];
        point[..32].copy_from_slice(&ic_point[0]);
        point[32..].copy_from_slice(&ic_point[1]);
        ic_points.push(point);
    }
    
    (alpha_g1, beta_g2, gamma_g2, delta_g2, ic_points)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_invalid_attribute_type() {
        let proof = vec![0u8; 256];
        let public_inputs = vec![1u8; 32];
        
        let result = verify_groth16_proof(&proof, &public_inputs, 99);
        assert!(result.is_err());
    }
    
    #[test]
    fn test_proof_length_validation() {
        let proof = vec![0u8; 100]; // Invalid length
        let public_inputs = vec![1u8; 32];
        
        let result = verify_groth16_proof(&proof, &public_inputs, 1);
        assert!(result.is_err());
    }
}
