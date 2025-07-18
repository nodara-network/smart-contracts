use crate::{
    errors::ErrorCode,
    states::{reward_accounts::*, task_accounts::*},
};
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(task_id: u64)]
pub struct DepositFunds<'info> {
    #[account(
        mut,
        seeds = [b"task", creator.key().as_ref(), &task_id.to_le_bytes()],
        bump = task_account.bump
    )]
    pub task_account: Account<'info, TaskAccount>,

    #[account(
        init,
        seeds = [b"vault", task_account.key().as_ref()],
        bump,
        payer = creator,
        space = RewardVaultAccount::INIT_SPACE
    )]
    pub reward_vault: Account<'info, RewardVaultAccount>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub system_program: Program<'info, System>,
}

impl<'info> DepositFunds<'info> {
    pub fn deposit_funds(&mut self, amount: u64) -> Result<()> {
        let vault = &mut self.reward_vault;
        let creator = &mut self.creator;

        **vault.to_account_info().try_borrow_mut_lamports()? += amount;
        **creator.to_account_info().try_borrow_mut_lamports()? -= amount;

        vault.task = self.task_account.key();
        vault.balance = amount;
        vault.bump = vault.bump; // Use the mutable reference to vault instead of self.reward_vault

        Ok(())
    }
}

#[derive(Accounts)]
pub struct DisburseRewards<'info> {
    #[account(mut)]
    pub task_account: Account<'info, TaskAccount>,

    #[account(
        mut,
        seeds = [b"vault", task_account.key().as_ref()],
        bump = reward_vault.bump
    )]
    pub reward_vault: Account<'info, RewardVaultAccount>,

    #[account(mut)]
    pub recipient: SystemAccount<'info>,
}

impl<'info> DisburseRewards<'info> {
    pub fn disburse_rewards(&mut self, amount: u64) -> Result<()> {
        let vault = &mut self.reward_vault;

        require!(vault.balance >= amount, ErrorCode::InsufficientVaultBalance);

        **self.recipient.try_borrow_mut_lamports()? += amount;
        **vault.to_account_info().try_borrow_mut_lamports()? -= amount;

        vault.balance -= amount;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct RefundRemaining<'info> {
    #[account(mut, has_one = creator)]
    pub task_account: Account<'info, TaskAccount>,

    #[account(
        mut,
        seeds = [b"vault", task_account.key().as_ref()],
        bump = reward_vault.bump,
        close = creator
    )]
    pub reward_vault: Account<'info, RewardVaultAccount>,

    #[account(mut)]
    pub creator: Signer<'info>,
}

impl<'info> RefundRemaining<'info> {
    pub fn refund_remaining(&mut self) -> Result<()> {
        let vault = &mut self.reward_vault;

        **self.creator.try_borrow_mut_lamports()? += vault.balance;
        **vault.to_account_info().try_borrow_mut_lamports()? -= vault.balance;

        vault.balance = 0;

        Ok(())
    }
}
