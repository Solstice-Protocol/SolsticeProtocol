use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Unauthorized access to this resource")]
    UnauthorizedAccess,
    
    #[msg("Invalid ZK proof provided")]
    InvalidProof,
    
    #[msg("Invalid public inputs for verification")]
    InvalidPublicInputs,
    
    #[msg("Identity not verified yet")]
    IdentityNotVerified,
    
    #[msg("Identity commitment mismatch")]
    CommitmentMismatch,
    
    #[msg("Session has expired")]
    SessionExpired,
    
    #[msg("Session already exists")]
    SessionAlreadyExists,
    
    #[msg("Merkle proof verification failed")]
    MerkleProofFailed,
    
    #[msg("Attribute not verified")]
    AttributeNotVerified,
    
    #[msg("Invalid attribute type")]
    InvalidAttributeType,
    
    #[msg("Identity already registered")]
    IdentityAlreadyExists,
    
    #[msg("Compression operation failed")]
    CompressionError,
    
    #[msg("Invalid nullifier")]
    InvalidNullifier,
    
    #[msg("Merkle tree error")]
    MerkleTreeError,
}
