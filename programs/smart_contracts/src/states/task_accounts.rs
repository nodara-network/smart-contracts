use anchor_lang::prelude::*;

use crate::{constants::MAX_INPUT_SIZE, types::TaskType};

#[account]
#[derive(InitSpace)]
pub struct TaskAccount {
    pub task_id: u64,
    pub creator: Pubkey,
    pub task_type: TaskType,
    #[max_len(MAX_INPUT_SIZE / 8)]
    pub input_data: Vec<u8>,
    pub reward_per_response: u64,
    pub max_responses: u8,
    pub deadline: i64,
    pub responses_received: u8,
    pub is_complete: bool,
    pub bump: u8,
}
