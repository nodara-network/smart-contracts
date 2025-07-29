use anchor_lang::prelude::*;

use crate::{
    errors::{ErrorCode, TaskError},
    RewardVaultAccount, TaskAccount
};

/// Creates a new task and stores it in a PDA.
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
    pub task_account: Account<'info, TaskAccount>, // Task PDA

    #[account(mut)]
    pub creator: Signer<'info>, // Task creator

    pub system_program: Program<'info, System>, // System program
}

/// Closes a task and refunds remaining balance.
#[derive(Accounts)]
pub struct CancelTask<'info> {
    #[account(
        mut,
        seeds = [b"task", task_account.creator.as_ref(), &task_account.task_id.to_le_bytes()],
        bump = task_account.bump,
        close = creator
    )]
    pub task_account: Account<'info, TaskAccount>, // Task to cancel

    #[account(mut, address = task_account.creator)]
    pub creator: Signer<'info>, // Must match creator

    #[account(
        mut,
        seeds = [b"vault", task_account.key().as_ref()],
        bump = reward_vault.bump,
        close = creator
    )]
    pub reward_vault: Account<'info, RewardVaultAccount>, // Task vault

    pub system_program: Program<'info, System>, // System program
}

/// Marks a task as complete.
#[derive(Accounts)]
pub struct MarkTaskComplete<'info> {
    #[account(
        mut,
        seeds = [b"task", task_account.creator.as_ref(), &task_account.task_id.to_le_bytes()],
        bump = task_account.bump,
        has_one = creator
    )]
    pub task_account: Account<'info, TaskAccount>, // Task to complete

    #[account(address = task_account.creator)]
    pub creator: Signer<'info>, // Must match creator
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

// NOT INCLUDED IN V0
impl<'info> CancelTask<'info> {
    pub fn cancel_task(&mut self) -> Result<()> {
        let task = &mut self.task_account;

        require!(!task.is_complete, ErrorCode::TaskAlreadyComplete); 
        require!(
            Clock::get()?.unix_timestamp < task.deadline,
            TaskError::DeadlinePassed
        );
        
        Ok(())
    }
}

impl<'info> MarkTaskComplete<'info> {
    pub fn mark_task_complete(&mut self) -> Result<()> {
        let task = &mut self.task_account;

        require!(!task.is_complete, ErrorCode::TaskAlreadyComplete);
        // require!(
        //     task.responses_received >= task.max_responses,
        //     ErrorCode::NotEnoughResponses
        // ); // Require enough responses

        task.is_complete = true; // Mark complete

        // TODO: May be bypassed if completion happens via MagicBlock

        Ok(())
    }
}
