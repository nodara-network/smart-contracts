use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Input data too large.")]
    InputTooLarge,
    #[msg("Task already marked complete.")]
    TaskAlreadyComplete,
    #[msg("Not enough valid responses yet.")]
    NotEnoughResponses,
    #[msg("Response already exists.")]
    ResponseAlreadyExists,
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

    #[msg("Invalid creator.")]
    InvalidCreator,

    #[msg("Task already marked complete.")]
    TaskAlreadyComplete,

    #[msg("Deadline has already passed.")]
    DeadlinePassed,

    #[msg("Max responses reached.")]
    MaxResponsesReached,

    #[msg("Response already exists.")]
    ResponseAlreadyExists,

    #[msg("Unauthorized")]
    Unauthorized,

    #[msg("Not enough responses yet")]
    NotEnoughResponses,

    #[msg("Cannot cancel task with responses unless deadline passed")]
    InvalidCancellation,

    #[msg("Response already verified")]
    ResponseAlreadyVerified,

    #[msg("Not enough verified responses to complete task")]
    NotEnoughVerifiedResponses,
}

#[error_code]
pub enum RewardError {
    #[msg("Failed to transfer lamports")]
    TransferFailed,

    #[msg("Invalid deposit amount")]
    InvalidDepositAmount,

    #[msg("Vault does not have enough balance.")]
    InsufficientVaultBalance,

    #[msg("Task must be completed before disbursing rewards")]
    TaskNotComplete,

    #[msg("Response must be verified before receiving rewards")]
    ResponseNotVerified,

    #[msg("Reward amount exceeds the reward per response")]
    ExcessiveRewardAmount,
}

#[error_code]
pub enum MagicblockError {
    #[msg("Failed to delegate task authority.")]
    DelegateFailed,
}
