use anchor_lang::prelude::*;

declare_id!("Afja4Q8urL5j8Hn3PpCkgP2Tgpe8xtp98khPmAVZF5Vk");

pub mod instructions;
pub mod states;
pub mod constants;
pub mod errors;

pub use instructions::*;

#[program]
pub mod smart_contracts {
    use super::*;

    pub fn say_hello(ctx: Context<SayHello>) -> Result<()> {
        ctx.accounts.say_hello()?;
        Ok(())
    }
}