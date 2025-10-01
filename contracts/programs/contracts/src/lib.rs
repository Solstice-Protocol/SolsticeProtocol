use anchor_lang::prelude::*;

declare_id!("BuJQaP3qTAPgLrmyupbdv2R6EBgK9SnuEJd23HWQqBJv");

#[program]
pub mod contracts {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
