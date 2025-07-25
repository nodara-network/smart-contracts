#![allow(unexpected_cfgs)]
use anchor_lang::prelude::*;

declare_id!("Afja4Q8urL5j8Hn3PpCkgP2Tgpe8xtp98khPmAVZF5Vk");

pub mod constants;
pub mod errors;
pub mod instructions;
pub mod states;
pub mod types;

pub use instructions::*;
pub use states::*;
pub use types::*;

#[program]
pub mod smart_contracts {
    use super::*;

    pub fn say_hello(ctx: Context<SayHello>) -> Result<()> {
        ctx.accounts.say_hello()?;
        Ok(())
    }

    // creator calls this to create a task
    pub fn create_task(
        ctx: Context<CreateTask>,
        task_id: u64,
        reward_per_response: u64,
        max_responses: u16,
        deadline: i64,
        cid: String,
    ) -> Result<()> {
        ctx.accounts
            .create_task(task_id, reward_per_response, max_responses, deadline, cid)?;
        Ok(())
    }

    // creator calls this to cancel a task
    pub fn cancel_task(ctx: Context<CancelTask>) -> Result<()> {
        ctx.accounts.cancel_task()?;
        Ok(())
    }

    // creator/admin calls this to mark a task as complete
    pub fn mark_task_complete(ctx: Context<MarkTaskComplete>) -> Result<()> {
        ctx.accounts.mark_task_complete()?;
        Ok(())
    }

    // magic block
    pub fn submit_response(ctx: Context<SubmitResponse>, cid: String) -> Result<()> {
        ctx.accounts.submit_response(cid)?;
        Ok(())
    }

    // admin
    pub fn verify_response(ctx: Context<VerifyResponse>) -> Result<()> {
        ctx.accounts.verify_response()?;
        Ok(())
    }

    pub fn quorum_reached(ctx: Context<QuorumReached>) -> Result<()> {
        ctx.accounts.quorum_reached()?;
        Ok(())
    }

    // creator
    pub fn deposit_funds(ctx: Context<DepositFunds>, amount: u64) -> Result<()> {
        ctx.accounts.deposit_funds(amount)
    }

    // admin
    pub fn disburse_rewards(ctx: Context<DisburseRewards>, amount: u64) -> Result<()> {
        ctx.accounts.disburse_rewards(amount)
    }

    // admin
    pub fn refund_remaining(ctx: Context<RefundRemaining>) -> Result<()> {
        ctx.accounts.refund_remaining()
    }
}

/*
    TODO:
    1. check everywhere where the admin is signer
    2.
*/
