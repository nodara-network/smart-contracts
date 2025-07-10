use anchor_lang::prelude::*;

declare_id!("Afja4Q8urL5j8Hn3PpCkgP2Tgpe8xtp98khPmAVZF5Vk");

pub mod constants;
pub mod errors;
pub mod instructions;
pub mod states;

pub use instructions::*;

#[program]
pub mod smart_contracts {
    use super::*;

    pub fn say_hello(ctx: Context<SayHello>) -> Result<()> {
        ctx.accounts.say_hello()?;
        Ok(())
    }

    pub fn create_task(ctx: Context<CreateTask>) -> Result<()> {
        ctx.accounts.create_task()?;
        Ok(())
    }

    pub fn create_reward(ctx: Context<CreateReward>) -> Result<()> {
        ctx.accounts.create_reward()?;
        Ok(())
    }

    pub fn create_response(ctx: Context<CreateResponse>) -> Result<()> {
        ctx.accounts.create_response()?;
        Ok(())
    }
}
