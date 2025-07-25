use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct ResponseAccount {
    pub task_bump: u8,     // Which task this response is linked to
    pub responder: Pubkey, // Phone wallet
    pub timestamp: i64,    // When response was submitted
    pub is_verified: bool, // Can be true by default, or marked later
    pub bump: u8,
    #[max_len(100)]
    pub cid: String,
}
