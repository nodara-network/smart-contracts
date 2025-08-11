use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct TaskAccount {
    pub task_id: u64,
    pub creator: Pubkey,
    pub reward_per_response: u64, // We decide
    pub max_responses: u16, // We decide
    pub deadline: i64,
    pub responses_received: u16, // Admin update
    pub is_complete: bool,
    pub task_bump: u8,
    #[max_len(100)]
    pub cid: String,
}
