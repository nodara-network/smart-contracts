use crate::{
    errors::{ErrorCode, RewardError},
    states::{reward_accounts::*, task_accounts::*},
};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct DepositFunds<'info> {
    #[account(
        mut,
        seeds = [b"task", task_account.creator.key().as_ref(), &task_account.task_id.to_le_bytes()],
        bump = task_account.bump
    )]
    pub task_account: Account<'info, TaskAccount>,

    #[account(
        init_if_needed,
        seeds = [b"vault", task_account.key().as_ref()],
        bump,
        payer = creator,
        space = 8 + RewardVaultAccount::INIT_SPACE
    )]
    pub reward_vault: Account<'info, RewardVaultAccount>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub system_program: Program<'info, System>,
}

impl<'info> DepositFunds<'info> {
    pub fn deposit_funds(&mut self, amount: u64) -> Result<()> {
        let vault_info = self.reward_vault.to_account_info();
        let creator_info = self.creator.to_account_info();

        let mut vault_lamports = match vault_info.try_borrow_mut_lamports() {
            Ok(lamports) => lamports,
            Err(_) => {
                msg!("Failed to borrow vault lamports");
                return Err(RewardError::TransferFailed.into());
            }
        };

        let mut creator_lamports = match creator_info.try_borrow_mut_lamports() {
            Ok(lamports) => lamports,
            Err(_) => {
                msg!("Failed to borrow creator lamports");
                return Err(RewardError::TransferFailed.into());
            }
        };

        if **creator_lamports < amount {
            msg!("Insufficient funds in creator account");
            return Err(RewardError::InsufficientFunds.into());
        }

        let new_creator_balance = match (**creator_lamports).checked_sub(amount) {
            Some(value) => value,
            None => {
                msg!("Underflow when subtracting from creator lamports");
                return Err(RewardError::TransferFailed.into());
            }
        };

        let new_vault_balance = match (**vault_lamports).checked_add(amount) {
            Some(value) => value,
            None => {
                msg!("Overflow when adding to vault lamports");
                return Err(RewardError::TransferFailed.into());
            }
        };

        // Apply transfers
        **creator_lamports = new_creator_balance;
        **vault_lamports = new_vault_balance;

        // Update vault metadata
        self.reward_vault.task_bump = self.task_account.bump;
        self.reward_vault.bump = self.reward_vault.bump;

        self.reward_vault.balance = match self.reward_vault.balance.checked_add(amount) {
            Some(updated_balance) => updated_balance,
            None => {
                msg!("Overflow when updating reward vault balance");
                return Err(RewardError::TransferFailed.into());
            }
        };

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

        // TODO: Require signer to be MagicBlock delegate before disbursing

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

        // TODO: Optionally require MagicBlock (if delegate-based cancel happens)

        **self.creator.try_borrow_mut_lamports()? += vault.balance;
        **vault.to_account_info().try_borrow_mut_lamports()? -= vault.balance;

        vault.balance = 0;

        Ok(())
    }
}
