use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Treasury {
    pub task_bump: u8,                // Linked task bump
    pub balance: u64,                 // Vault balance
    pub bump: u8,                     // PDA bump
}

