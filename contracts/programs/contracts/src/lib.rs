use anchor_lang::prelude::*;

declare_id!("ELqNcvWpY4L5qAe7P4PuEKMo86zrouKctZF3KuSysuYY");

pub mod state;
pub mod instructions;
pub mod errors;
pub mod groth16_verifier;
pub mod compression;
pub mod verification_keys;

use instructions::*;
use errors::ErrorCode;
use groth16_verifier::*;
use compression::*;

#[program]
pub mod contracts {
    use super::*;

    /// Initialize the identity registry
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let registry = &mut ctx.accounts.registry;
        registry.authority = ctx.accounts.authority.key();
        registry.total_identities = 0;
        registry.bump = ctx.bumps.registry;
        
        msg!("Identity Registry initialized by: {:?}", ctx.accounts.authority.key());
        Ok(())
    }

    /// Register a new identity with compressed commitment using Light Protocol
    pub fn register_identity(
        ctx: Context<RegisterIdentity>,
        identity_commitment: [u8; 32],
        merkle_root: [u8; 32],
    ) -> Result<()> {
        let identity = &mut ctx.accounts.identity;
        let registry = &mut ctx.accounts.registry;
        
        // Compress identity data using Light Protocol
        let compressed_state = compress_identity_data(
            ctx.accounts.user.key(),
            &identity_commitment,
            &merkle_root,
        )?;
        
        identity.owner = ctx.accounts.user.key();
        identity.identity_commitment = identity_commitment;
        identity.merkle_root = merkle_root;
        identity.is_verified = false;
        identity.verification_timestamp = 0;
        identity.attributes_verified = 0; // Bitmap for verified attributes
        identity.bump = ctx.bumps.identity;
        
        registry.total_identities += 1;
        
        msg!("Identity registered for user: {:?}", ctx.accounts.user.key());
        msg!("Compressed state hash: {:?}", compressed_state);
        
        // Log compression savings
        let (bytes_saved, percentage) = calculate_compression_savings();
        msg!("Storage savings: {} bytes ({}%)", bytes_saved, percentage);
        
        Ok(())
    }

    /// Verify identity with ZK proof using Groth16
    pub fn verify_identity(
        ctx: Context<VerifyIdentity>,
        proof: Vec<u8>,
        public_inputs: Vec<u8>,
        attribute_type: u8, // 1=age, 2=nationality, 4=uniqueness
    ) -> Result<()> {
        let identity = &mut ctx.accounts.identity;
        let clock = Clock::get()?;
        
        // Verify proof length
        require!(proof.len() == 256, ErrorCode::InvalidProof);
        require!(public_inputs.len() > 0, ErrorCode::InvalidPublicInputs);
        
        // Perform Groth16 verification
        let is_valid = verify_groth16_proof(
            &proof,
            &public_inputs,
            attribute_type,
        )?;
        
        require!(is_valid, ErrorCode::InvalidProof);
        
        // Mark attribute as verified (bitmap)
        identity.attributes_verified |= attribute_type;
        identity.is_verified = true;
        identity.verification_timestamp = clock.unix_timestamp;
        
        msg!("Identity verified with attribute type: {}", attribute_type);
        Ok(())
    }

    /// Update identity commitment (for re-verification)
    pub fn update_identity(
        ctx: Context<UpdateIdentity>,
        new_commitment: [u8; 32],
        new_merkle_root: [u8; 32],
    ) -> Result<()> {
        let identity = &mut ctx.accounts.identity;
        
        identity.identity_commitment = new_commitment;
        identity.merkle_root = new_merkle_root;
        identity.is_verified = false; // Reset verification status
        identity.attributes_verified = 0;
        
        msg!("Identity updated for user: {:?}", ctx.accounts.user.key());
        Ok(())
    }

    /// Revoke identity verification
    pub fn revoke_identity(ctx: Context<RevokeIdentity>) -> Result<()> {
        let identity = &mut ctx.accounts.identity;
        
        identity.is_verified = false;
        identity.attributes_verified = 0;
        
        msg!("Identity revoked for user: {:?}", ctx.accounts.user.key());
        Ok(())
    }

    /// Create authentication session
    pub fn create_session(
        ctx: Context<CreateSession>,
        session_id: [u8; 32],
        expiry: i64,
    ) -> Result<()> {
        let session = &mut ctx.accounts.session;
        let identity = &ctx.accounts.identity;
        require!(identity.is_verified, ErrorCode::IdentityNotFound);
        session.user = ctx.accounts.user.key();
        session.session_id = session_id;
        session.created_at = Clock::get()?.unix_timestamp;
        session.expires_at = expiry;
        session.is_active = true;
        session.bump = ctx.bumps.session;
        
        msg!("Session created for user: {:?}", ctx.accounts.user.key());
        Ok(())
    }

    /// Close authentication session
    pub fn close_session(ctx: Context<CloseSession>) -> Result<()> {
        let session = &mut ctx.accounts.session;
        session.is_active = false;
        
        msg!("Session closed for user: {:?}", ctx.accounts.user.key());
        Ok(())
    }
}
