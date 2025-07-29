use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct AdminAccount {
  pub authority: Pubkey,
  pub bump: u8,
}