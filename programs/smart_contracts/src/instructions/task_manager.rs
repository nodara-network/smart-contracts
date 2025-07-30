use anchor_lang::prelude::*;

use crate::{errors::TaskError, AdminAccount, TaskAccount};

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

impl<'info> CreateTask<'info> {
    pub fn create_task(
        &mut self,
        task_id: u64,
        reward_per_response: u64,
        max_responses: u16,
        deadline: i64,
        cid: String,
        bumps: CreateTaskBumps,
    ) -> Result<()> {
        // Ensure the task ID is non-zero
        if task_id == 0 {
            return Err(TaskError::InvalidTaskId.into());
        }

        // Ensure the reward is greater than zero
        if reward_per_response == 0 {
            return Err(TaskError::InvalidReward.into());
        }

        // Ensure max responses is a positive number
        if max_responses == 0 {
            return Err(TaskError::InvalidMaxResponses.into());
        }

        // Ensure deadline is in the future
        let current_timestamp = Clock::get()?.unix_timestamp;
        if deadline <= current_timestamp {
            return Err(TaskError::InvalidDeadline.into());
        }

        // Ensure CID is not empty
        if cid.trim().is_empty() {
            return Err(TaskError::InvalidCID.into());
        }

        // Initialize the task account
        self.task_account.set_inner(TaskAccount {
            task_id,
            creator: self.creator.key(),
            reward_per_response,
            max_responses,
            deadline,
            responses_received: 0,
            is_complete: false,
            bump: bumps.task_account,
            cid,
        });

        msg!(
            "Task created successfully {}",
            self.task_account.key().to_string()
        );

        Ok(())
    }
}

#[derive(Accounts)]
pub struct MarkTaskComplete<'info> {
    #[account(
        mut,
        seeds = [b"task", task_account.creator.as_ref(), &task_account.task_id.to_le_bytes()],
        bump = task_account.bump,
    )]
    pub task_account: Account<'info, TaskAccount>,

    #[account(
        mut,
        seeds = [b"admin"],
        bump = admin_account.bump,
    )]
    pub admin_account: Account<'info, AdminAccount>,

    #[account(mut)]
    pub signer: Signer<'info>,
}

impl<'info> MarkTaskComplete<'info> {
    pub fn mark_task_complete(&mut self) -> Result<()> {
        let task = &self.task_account;

        require!(
            self.admin_account.authority == self.signer.key()
                || self.signer.key() == self.task_account.creator.key(),
            TaskError::Unauthorized
        );

        require!(!task.is_complete, TaskError::TaskAlreadyComplete);

        self.task_account.is_complete = true;

        Ok(())
    }
}
