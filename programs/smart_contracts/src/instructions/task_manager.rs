use anchor_lang::prelude::*;

use crate::{errors::ErrorCode, states::TaskAccount};

#[derive(Accounts)]
#[instruction(task_id: u64)]
pub struct CreateTask<'info> {
    #[account(
        init,
        seeds = [b"task", creator.key().as_ref(), &task_id.to_le_bytes()],
        bump,
        payer = creator,
        space = 8 + TaskAccount::INIT_SPACE
    )]
    pub task_account: Account<'info, TaskAccount>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CancelTask<'info> {
    #[account(
        mut,
        seeds = [b"task", task_account.creator.as_ref(), &task_account.task_id.to_le_bytes()],
        bump = task_account.bump,
        close = creator // refund rent
    )]
    pub task_account: Account<'info, TaskAccount>,

    #[account(mut, address = task_account.creator)]
    pub creator: Signer<'info>,
}

#[derive(Accounts)]
pub struct MarkTaskComplete<'info> {
    #[account(
        mut,
        seeds = [b"task", task_account.creator.as_ref(), &task_account.task_id.to_le_bytes()],
        bump = task_account.bump
    )]
    pub task_account: Account<'info, TaskAccount>,

    #[account(address = task_account.creator)]
    pub creator: Signer<'info>,
}

impl<'info> CreateTask<'info> {
    pub fn create_task(
        &mut self,
        task_id: u64,
        reward_per_response: u64,
        max_responses: u16,
        deadline: i64,
        cid: String,
    ) -> Result<()> {
        self.task_account.set_inner(TaskAccount {
            task_id,
            creator: self.creator.key(),
            reward_per_response,
            max_responses,
            deadline,
            responses_received: 0,
            is_complete: false,
            bump: self.task_account.bump,
            cid,
        });

        Ok(())
    }
}

impl<'info> CancelTask<'info> {
    pub fn cancel_task(&mut self) -> Result<()> {
        let task = &mut self.task_account;

        require!(!task.is_complete, ErrorCode::TaskAlreadyComplete);
        require!(
            Clock::get()?.unix_timestamp < task.deadline,
            ErrorCode::DeadlinePassed
        );

        // trigger vault refund here via CPI later

        Ok(())
    }
}

impl<'info> MarkTaskComplete<'info> {
    pub fn mark_task_complete(&mut self) -> Result<()> {
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
