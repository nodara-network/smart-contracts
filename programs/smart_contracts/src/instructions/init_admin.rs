use anchor_lang::prelude::*;

use crate::AdminAccount;

#[derive(Accounts)]
pub struct InitAdmin<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
      init,
      payer = admin,
      space = 8 + AdminAccount::INIT_SPACE,
      seeds = [b"admin"],
      bump
    )]
    pub admin_account: Account<'info, AdminAccount>,

    pub system_program: Program<'info, System>,
}

impl<'info> InitAdmin<'info> {
    pub fn delegate(&mut self, bumps: InitAdminBumps) -> Result<()> {
        self.admin_account.authority = self.admin.key();
        self.admin_account.bump = bumps.admin_account;
        Ok(())
    }
}
