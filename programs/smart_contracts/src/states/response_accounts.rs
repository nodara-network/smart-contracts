use anchor_lang::prelude::*;

use crate::constants::MAX_PAYLOAD_SIZE;

#[account]
#[derive(InitSpace)]
pub struct ResponseAccount {
    pub task: Pubkey,      // Which task this response is linked to
    pub responder: Pubkey, // Phone wallet
    #[max_len(MAX_PAYLOAD_SIZE / 8)]
    pub payload: Vec<u8>, // Encrypted result, proof, or raw output
    pub timestamp: i64,    // When response was submitted
    pub is_verified: bool, // Can be true by default, or marked later
    pub bump: u8,
}
