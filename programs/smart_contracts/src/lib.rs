#![allow(unexpected_cfgs)]
use anchor_lang::prelude::*;

declare_id!("NDRAKc9KJzfX2ymdJQ7Ad3sr4FSdP7wixVoTVTWt7hU");

pub mod constants;
pub mod errors;
pub mod instructions;
pub mod states;

pub use instructions::*;
pub use states::*;

#[program]
pub mod smart_contracts {
    use super::*;

    pub fn init_admin(ctx: Context<InitAdmin>) -> Result<()> {
        ctx.accounts.delegate(ctx.bumps)
    }

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
    pub fn deposit_funds(ctx: Context<DepositFunds>, task_id: u64, amount: u64) -> Result<()> {
        ctx.accounts.deposit_funds(task_id, amount, ctx.bumps)
    }

    pub fn submit_response(ctx: Context<SubmitResponse>, cid: String) -> Result<()> {
        ctx.accounts.submit_response(cid)
    }

    pub fn refund_remaining(ctx: Context<RefundRemaining>) -> Result<()> {
        ctx.accounts.refund_remaining()
    }

    pub fn mark_task_complete(ctx: Context<MarkTaskComplete>) -> Result<()> {
        ctx.accounts.mark_task_complete()
    }

    pub fn verify_response(ctx: Context<VerifyResponse>) -> Result<()> {
        ctx.accounts.verify_response()
    }

    // LEFT
    pub fn disburse_rewards(ctx: Context<DisburseRewards>) -> Result<()> {
        ctx.accounts.disburse_rewards()
    }
}
