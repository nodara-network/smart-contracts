use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct ResponseAccount {
    pub task_bump: u8,                // Linked task bump
    pub responder: Pubkey,            // Responder's pubkey
    pub timestamp: i64,               // Submission time
    pub is_verified: bool,            // Verification flag
    pub bump: u8,                     // PDA bump
    #[max_len(100)]
    pub cid: String,                  // IPFS or Arweave CID
}
