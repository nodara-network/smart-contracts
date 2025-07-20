use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct RewardVaultAccount {
    pub task: Pubkey, // Associated task
    pub balance: u64, // Total balance deposited
    pub bump: u8,
}
