use crate::{
    errors::{ErrorCode, RewardError},
    states::{reward_accounts::*, task_accounts::*},
};
use anchor_lang::{
    prelude::*,
    solana_program::{program::invoke, system_instruction::transfer},
};

#[derive(Accounts)]
#[instruction(task_id: u64)]
pub struct DepositFunds<'info> {
    #[account(
        mut,
        seeds = [b"task", creator.key().as_ref(), task_id.to_le_bytes().as_ref()],
        bump
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
    pub fn deposit_funds(
        &mut self,
        _task_id: u64,
        amount: u64,
        bumps: DepositFundsBumps,
    ) -> Result<()> {
        if amount == 0 {
            msg!("Attempted to deposit zero lamports");
            return Err(RewardError::InvalidDepositAmount.into());
        }

        // ? - exit early from the function
        invoke(
            &transfer(&self.creator.key(), &self.reward_vault.key(), amount),
            &[
                self.creator.to_account_info(),
                self.reward_vault.to_account_info(),
                self.system_program.to_account_info(),
            ],
        )
        .map_err(|e| {
            msg!("Failed to transfer lamports via CPI: {}", e);
            RewardError::TransferFailed
        })?;

        // ? - exit early from the function
        let vault_balance = self
            .reward_vault
            .balance
            .checked_add(amount)
            .ok_or_else(|| {
                msg!("Overflow when adding to reward vault balance");
                RewardError::TransferFailed
            })?;

        self.reward_vault.set_inner(RewardVaultAccount {
            task_bump: bumps.task_account,
            balance: vault_balance,
            bump: bumps.reward_vault,
        });

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
