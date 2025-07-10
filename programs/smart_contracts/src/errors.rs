use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Input data too large.")]
    InputTooLarge,
    #[msg("Task already marked complete.")]
    TaskAlreadyComplete,
    #[msg("Deadline has already passed.")]
    DeadlinePassed,
    #[msg("Not enough valid responses yet.")]
    NotEnoughResponses,
}
