use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct TaskAccount {
    pub task_id: u64,                  // Task ID
    pub creator: Pubkey,              // Task creator
    pub reward_per_response: u64,     // Reward per response
    pub max_responses: u16,           // Max allowed responses
    pub deadline: i64,                // Submission deadline
    pub responses_received: u16,      // Responses received so far
    pub is_complete: bool,            // Task completion flag
    pub bump: u8,                     // PDA bump
    #[max_len(100)]
    pub cid: String,                  // IPFS or Arweave CID
}
