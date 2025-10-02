use anchor_lang::prelude::*;

/// Global identity registry state
#[account]
pub struct IdentityRegistry {
    pub authority: Pubkey,
    pub total_identities: u64,
    pub bump: u8,
}

impl IdentityRegistry {
    pub const LEN: usize = 8 + // discriminator
        32 + // authority
        8 + // total_identities
        1; // bump
}

/// Individual identity account with compressed commitment
#[account]
pub struct Identity {
    pub owner: Pubkey,
    pub identity_commitment: [u8; 32], // Hash of identity data
    pub merkle_root: [u8; 32], // Root of compressed merkle tree
    pub is_verified: bool,
    pub verification_timestamp: i64,
    pub attributes_verified: u8, // Bitmap: 1=age, 2=nationality, 4=uniqueness, etc.
    pub bump: u8,
}

impl Identity {
    pub const LEN: usize = 8 + // discriminator
        32 + // owner
        32 + // identity_commitment
        32 + // merkle_root
        1 + // is_verified
        8 + // verification_timestamp
        1 + // attributes_verified
        1; // bump
}

/// Authentication session for dApp access
#[account]
pub struct Session {
    pub user: Pubkey,
    pub session_id: [u8; 32],
    pub created_at: i64,
    pub expires_at: i64,
    pub is_active: bool,
    pub bump: u8,
}

impl Session {
    pub const LEN: usize = 8 + // discriminator
        32 + // user
        32 + // session_id
        8 + // created_at
        8 + // expires_at
        1 + // is_active
        1; // bump
}

/// Verification proof record for audit trail
#[account]
pub struct VerificationProof {
    pub identity: Pubkey,
    pub proof_hash: [u8; 32],
    pub public_inputs_hash: [u8; 32],
    pub attribute_type: u8,
    pub timestamp: i64,
    pub verifier: Pubkey,
}

impl VerificationProof {
    pub const LEN: usize = 8 + // discriminator
        32 + // identity
        32 + // proof_hash
        32 + // public_inputs_hash
        1 + // attribute_type
        8 + // timestamp
        32; // verifier
}
