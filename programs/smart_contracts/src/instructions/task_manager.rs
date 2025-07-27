use anchor_lang::prelude::*;

use crate::{errors::ErrorCode, RewardVaultAccount, TaskAccount};

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
        bump = task_account.bump
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
    ) -> Result<()> {
        self.task_account.set_inner(TaskAccount {
            task_id,                      // Task ID
            creator: self.creator.key(),  // Creator pubkey
            reward_per_response,          // Reward per response
            max_responses,                // Max responses allowed
            deadline,                     // Task deadline
            responses_received: 0,        // Start at 0
            is_complete: false,           // Not complete
            bump: self.task_account.bump, // Task bump
            cid,                          // Task CID
        });

        Ok(())
    }
}

impl<'info> CancelTask<'info> {
    pub fn cancel_task(&mut self) -> Result<()> {
        let task = &mut self.task_account;

        require!(!task.is_complete, ErrorCode::TaskAlreadyComplete); // Must not be complete
        require!(
            Clock::get()?.unix_timestamp < task.deadline,
            ErrorCode::DeadlinePassed
        ); // Must be before deadline

        let vault = &mut self.reward_vault;

        **self.creator.try_borrow_mut_lamports()? += vault.balance; // Refund to creator
        **vault.to_account_info().try_borrow_mut_lamports()? -= vault.balance; // Deduct from vault

        vault.balance = 0; // Clear vault

        Ok(())
    }
}

impl<'info> MarkTaskComplete<'info> {
    pub fn mark_task_complete(&mut self) -> Result<()> {
        let task = &mut self.task_account;

        require!(!task.is_complete, ErrorCode::TaskAlreadyComplete); // Must not be complete
        require!(
            task.responses_received >= task.max_responses,
            ErrorCode::NotEnoughResponses
        ); // Require enough responses

        task.is_complete = true; // Mark complete

        // TODO: May be bypassed if completion happens via MagicBlock
        
        Ok(())
    }
}
