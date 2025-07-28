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
    #[msg("Response already exists.")]
    ResponseAlreadyExists,
    #[msg("Vault does not have enough balance.")]
    InsufficientVaultBalance,
}

#[error_code]
pub enum TaskError {
    #[msg("Task ID must be non-zero.")]
    InvalidTaskId,

    #[msg("Reward per response must be greater than zero.")]
    InvalidReward,

    #[msg("Max responses must be greater than zero.")]
    InvalidMaxResponses,

    #[msg("Deadline must be in the future.")]
    InvalidDeadline,

    #[msg("CID cannot be empty.")]
    InvalidCID,
}
