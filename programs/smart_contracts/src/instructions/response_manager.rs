use crate::{
    constants::MAX_PAYLOAD_SIZE,
    errors::ErrorCode,
    states::{response_accounts::*, task_accounts::*},
};
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction()]
pub struct SubmitResponse<'info> {
    #[account(
        mut,
        seeds = [b"task", task_account.creator.as_ref(), &task_account.task_id.to_le_bytes()],
        bump = task_account.bump
    )]
    pub task_account: Account<'info, TaskAccount>,

    #[account(
        init,
        seeds = [b"response", task_account.key().as_ref(), responder.key().as_ref()],
        bump,
        payer = responder,
        space = ResponseAccount::INIT_SPACE
    )]
    pub response_account: Account<'info, ResponseAccount>,

    #[account(mut)]
    pub responder: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct VerifyResponse<'info> {
    #[account(mut)]
    pub response_account: Account<'info, ResponseAccount>,

    // Could be a verifier/admin in future
    pub signer: Signer<'info>,
}

#[derive(Accounts)]
pub struct QuorumReached<'info> {
    #[account(
        mut,
        seeds = [b"task", task_account.creator.as_ref(), &task_account.task_id.to_le_bytes()],
        bump = task_account.bump
    )]
    pub task_account: Account<'info, TaskAccount>,
}

impl<'info> SubmitResponse<'info> {
    pub fn submit_response(&mut self, payload: Vec<u8>) -> Result<()> {
        require!(payload.len() <= MAX_PAYLOAD_SIZE, ErrorCode::InputTooLarge);

        require!(
            Clock::get()?.unix_timestamp < self.task_account.deadline,
            ErrorCode::DeadlinePassed
        );

        self.response_account.set_inner(ResponseAccount {
            task: self.task_account.key(),
            responder: self.responder.key(),
            payload,
            timestamp: Clock::get()?.unix_timestamp,
            is_verified: true,
            bump: self.response_account.bump,
        });

        // update task response count
        self.task_account.responses_received =
            self.task_account.responses_received.saturating_add(1);

        Ok(())
    }
}

impl<'info> VerifyResponse<'info> {
    pub fn verify_response(&mut self) -> Result<()> {
        let response = &mut self.response_account;

        response.is_verified = true;

        Ok(())
    }
}

impl<'info> QuorumReached<'info> {
    pub fn quorum_reached(&mut self) -> Result<()> {
        let task = &mut self.task_account;

        require!(!task.is_complete, ErrorCode::TaskAlreadyComplete);
        require!(
            task.responses_received >= task.max_responses,
            ErrorCode::NotEnoughResponses
        );

        task.is_complete = true;

        Ok(())
    }
}
