use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid authority for this operation")]
    InvalidAuthority,
    
    #[msg("Identity already registered")]
    IdentityAlreadyRegistered,
    
    #[msg("Identity not found")]
    IdentityNotFound,
    
    #[msg("Invalid proof provided")]
    InvalidProof,
    
    #[msg("Invalid public inputs")]
    InvalidPublicInputs,
    
    #[msg("Proof verification failed")]
    ProofVerificationFailed,
    
    #[msg("Invalid verification status")]
    InvalidVerificationStatus,
    
    #[msg("Verification already exists")]
    VerificationAlreadyExists,
    
    #[msg("Verification not found")]
    VerificationNotFound,
    
    #[msg("Session expired")]
    SessionExpired,
    
    #[msg("Invalid session")]
    InvalidSession,
    
    #[msg("Compression error occurred")]
    CompressionError,
    
    #[msg("Invalid compressed account")]
    InvalidCompressedAccount,
    
    #[msg("Merkle tree error")]
    MerkleTreeError,
    
    #[msg("Unauthorized access to this resource")]
    UnauthorizedAccess,
}
