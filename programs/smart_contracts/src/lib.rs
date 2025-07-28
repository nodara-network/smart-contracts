#![allow(unexpected_cfgs)]
use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::anchor::ephemeral;

declare_id!("Afja4Q8urL5j8Hn3PpCkgP2Tgpe8xtp98khPmAVZF5Vk");

pub mod constants;
pub mod errors;
pub mod instructions;
pub mod states;
pub mod types;

pub use instructions::*;
pub use states::*;
pub use types::*;

#[ephemeral]
#[program]
pub mod smart_contracts {
    use super::*;

    // creator calls this to create a task
    pub fn create_task(
        ctx: Context<CreateTask>,
        task_id: u64,
        reward_per_response: u64,
        max_responses: u16,
        deadline: i64,
        cid: String,
    ) -> Result<()> {
        ctx.accounts.create_task(
            task_id,
            reward_per_response,
            max_responses,
            deadline,
            cid,
            ctx.bumps,
        )
    }

    // creator calls this to cancel a task
    pub fn cancel_task(ctx: Context<CancelTask>) -> Result<()> {
        ctx.accounts.cancel_task()
    }

    // creator/admin calls this to mark a task as complete
    pub fn mark_task_complete(ctx: Context<MarkTaskComplete>) -> Result<()> {
        ctx.accounts.mark_task_complete()
    }

    // magic block
    pub fn submit_response(ctx: Context<SubmitResponse>, cid: String) -> Result<()> {
        ctx.accounts.submit_response(cid)
    }

    // admin
    pub fn verify_response(ctx: Context<VerifyResponse>) -> Result<()> {
        ctx.accounts.verify_response()
    }

    // creator
    pub fn deposit_funds(ctx: Context<DepositFunds>, task_id: u64, amount: u64) -> Result<()> {
        ctx.accounts.deposit_funds(task_id, amount, ctx.bumps)
    }

    // admin
    pub fn disburse_rewards(ctx: Context<DisburseRewards>, amount: u64) -> Result<()> {
        ctx.accounts.disburse_rewards(amount)
    }

    // admin
    pub fn refund_remaining(ctx: Context<RefundRemaining>) -> Result<()> {
        ctx.accounts.refund_remaining()
    }

    // magicblock
    pub fn delegate_task_account(ctx: Context<DelegateTaskAccount>, task_id: u64) -> Result<()> {
        ctx.accounts.delegate(task_id)        
    }

    pub fn undelegate_task_account(ctx: Context<UndelegateTaskAccount>) -> Result<()> {
        ctx.accounts.undelegate()
    }
}

/*
    TODO:
    1. check everywhere where the admin is signer
    2.
*/
