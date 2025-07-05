use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct SayHello {}

impl SayHello {
    pub fn say_hello(&mut self) -> Result<()> {
      msg!("Hello Anchor!!");
      Ok(())
    }
}