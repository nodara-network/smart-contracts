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

    pub fn create_task(
        ctx: Context<CreateTask>,
        task_id: u64,
        task_type: TaskType,
        input_data: Vec<u8>,
        reward_per_response: u64,
        max_responses: u8,
        deadline: i64,
    ) -> Result<()> {
        ctx.accounts.create_task(
            task_id,
            task_type,
            input_data,
            reward_per_response,
            max_responses,
            deadline,
        )?;
        Ok(())
    }

    pub fn cancel_task(ctx: Context<CancelTask>) -> Result<()> {
        ctx.accounts.cancel_task()?;
        Ok(())
    }

    pub fn mark_task_complete(ctx: Context<MarkTaskComplete>) -> Result<()> {
        ctx.accounts.mark_task_complete()?;
        Ok(())
    }
}
