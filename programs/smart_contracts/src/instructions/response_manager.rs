use crate::{
    errors::TaskError,
    states::{response_accounts::*, task_accounts::*},
    AdminAccount,
};
use anchor_lang::prelude::*;

#[derive(Accounts)]
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
        payer = admin,
        space = ResponseAccount::INIT_SPACE
    )]
    pub response_account: Account<'info, ResponseAccount>,

    #[account(mut)]
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub responder: AccountInfo<'info>,

    #[account(
        mut,
        constraint = admin.key() == admin_account.authority
    )]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [b"admin"],
        bump = admin_account.bump
    )]
    pub admin_account: Account<'info, AdminAccount>,

    pub system_program: Program<'info, System>,
}

impl<'info> SubmitResponse<'info> {
    pub fn submit_response(&mut self, cid: String) -> Result<()> {
        require!(
            Clock::get()?.unix_timestamp < self.task_account.deadline,
            TaskError::DeadlinePassed
        );

        require!(
            self.task_account.responses_received < self.task_account.max_responses,
            TaskError::MaxResponsesReached
        );

        self.response_account.set_inner(ResponseAccount {
            task_bump: self.task_account.bump,
            responder: self.responder.key(),
            cid,
            timestamp: Clock::get()?.unix_timestamp,
            is_verified: true,
            bump: self.response_account.bump,
        });

        self.task_account.responses_received = self
            .task_account
            .responses_received
            .checked_add(1)
            .ok_or_else(|| TaskError::MaxResponsesReached)?;

        if self.task_account.responses_received == self.task_account.max_responses {
            self.task_account.is_complete = true;
        }

        Ok(())
    }
}

#[derive(Accounts)]
pub struct VerifyResponse<'info> {
    #[account(mut)]
    pub response_account: Account<'info, ResponseAccount>,

    #[account(
        mut,
        seeds = [b"admin"],
        bump = admin_account.bump
    )]
    pub admin_account: Account<'info, AdminAccount>,

    pub signer: Signer<'info>,
}

impl<'info> VerifyResponse<'info> {
    pub fn verify_response(&mut self) -> Result<()> {
        let response = &mut self.response_account;

        require!(
            self.admin_account.authority == self.signer.key(),
            TaskError::Unauthorized
        );

        response.is_verified = true;

        Ok(())
    }
}
