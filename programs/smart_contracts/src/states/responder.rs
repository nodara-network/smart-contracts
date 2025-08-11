use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Responder {
  pub authority: Pubkey,
  pub rewards: u64,
  pub responder_bump: u8,
}