use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct RewardVaultAccount {
    pub task_bump: u8, // Which task this response is linked to
    pub balance: u64,  // Total balance deposited
    pub bump: u8,
}
