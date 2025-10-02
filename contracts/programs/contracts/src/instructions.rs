use anchor_lang::prelude::*;
use crate::state::*;

/// Initialize the identity registry
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = IdentityRegistry::LEN,
        seeds = [b"registry"],
        bump
    )]
    pub registry: Account<'info, IdentityRegistry>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

/// Register a new identity
#[derive(Accounts)]
pub struct RegisterIdentity<'info> {
    #[account(
        init,
        payer = user,
        space = Identity::LEN,
        seeds = [b"identity", user.key().as_ref()],
        bump
    )]
    pub identity: Account<'info, Identity>,
    
    #[account(mut)]
    pub registry: Account<'info, IdentityRegistry>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

/// Verify an identity with ZK proof
#[derive(Accounts)]
pub struct VerifyIdentity<'info> {
    #[account(
        mut,
        seeds = [b"identity", user.key().as_ref()],
        bump = identity.bump,
        constraint = identity.owner == user.key() @ crate::errors::ErrorCode::UnauthorizedAccess
    )]
    pub identity: Account<'info, Identity>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    /// CHECK: Verifier authority (could be oracle or multisig)
    pub verifier: AccountInfo<'info>,
}

/// Update identity commitment
#[derive(Accounts)]
pub struct UpdateIdentity<'info> {
    #[account(
        mut,
        seeds = [b"identity", user.key().as_ref()],
        bump = identity.bump,
        constraint = identity.owner == user.key() @ crate::errors::ErrorCode::UnauthorizedAccess
    )]
    pub identity: Account<'info, Identity>,
    
    #[account(mut)]
    pub user: Signer<'info>,
}

/// Revoke identity verification
#[derive(Accounts)]
pub struct RevokeIdentity<'info> {
    #[account(
        mut,
        seeds = [b"identity", user.key().as_ref()],
        bump = identity.bump,
        constraint = identity.owner == user.key() @ crate::errors::ErrorCode::UnauthorizedAccess
    )]
    pub identity: Account<'info, Identity>,
    
    #[account(mut)]
    pub user: Signer<'info>,
}

/// Create authentication session
#[derive(Accounts)]
#[instruction(session_id: [u8; 32])]
pub struct CreateSession<'info> {
    #[account(
        init,
        payer = user,
        space = Session::LEN,
        seeds = [b"session", user.key().as_ref(), &session_id],
        bump
    )]
    pub session: Account<'info, Session>,
    
    #[account(
        seeds = [b"identity", user.key().as_ref()],
        bump = identity.bump,
        constraint = identity.owner == user.key() @ crate::errors::ErrorCode::UnauthorizedAccess
    )]
    pub identity: Account<'info, Identity>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

/// Close authentication session
#[derive(Accounts)]
pub struct CloseSession<'info> {
    #[account(
        mut,
        close = user,
        seeds = [b"session", user.key().as_ref(), &session.session_id],
        bump = session.bump,
        has_one = user @ crate::errors::ErrorCode::UnauthorizedAccess
    )]
    pub session: Account<'info, Session>,
    
    #[account(mut)]
    pub user: Signer<'info>,
}
