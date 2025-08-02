use crate::{
    errors::{RewardError, TaskError},
    states::{reward_accounts::*, task_accounts::*},
    AdminAccount, ResponseAccount,
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

    #[account(
        mut,
        seeds = [b"admin"],
        bump = admin_account.bump
    )]
    pub admin_account: Account<'info, AdminAccount>,

    #[account(
        mut,
        constraint = admin_authority.key() == admin_account.authority
    )]
    /// CHECK: This is safe because we check it matches admin_account.authority
    pub admin_authority: UncheckedAccount<'info>,

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

        let platform_fee = amount
            .checked_mul(69)
            .and_then(|v| v.checked_div(1000))
            .ok_or_else(|| {
                msg!("Overflow while calculating platform fee");
                RewardError::TransferFailed
            })?;

        let net_deposit = amount.checked_sub(platform_fee).ok_or_else(|| {
            msg!("Underflow when subtracting platform fee");
            RewardError::TransferFailed
        })?;

        invoke(
            &transfer(
                &self.creator.key(),
                &self.admin_authority.key(),
                platform_fee,
            ),
            &[
                self.creator.to_account_info(),
                self.admin_authority.to_account_info(),
                self.system_program.to_account_info(),
            ],
        )
        .map_err(|e| {
            msg!(
                "Failed to transfer platform fee ({} lamports) to admin: {}",
                platform_fee,
                e
            );
            RewardError::TransferFailed
        })?;

        // Transfer net deposit to reward vault
        invoke(
            &transfer(&self.creator.key(), &self.reward_vault.key(), net_deposit),
            &[
                self.creator.to_account_info(),
                self.reward_vault.to_account_info(),
                self.system_program.to_account_info(),
            ],
        )
        .map_err(|e| {
            msg!(
                "Failed to transfer net deposit ({} lamports) to reward vault: {}",
                net_deposit,
                e
            );
            RewardError::TransferFailed
        })?;

        let vault_balance = self
            .reward_vault
            .balance
            .checked_add(net_deposit)
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
pub struct RefundRemaining<'info> {
    #[account(
        mut,
        has_one = creator,
        seeds = [b"task", creator.key().as_ref(), task_account.task_id.to_le_bytes().as_ref()],
        bump = task_account.bump,
    )]
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
        require!(
            !self.task_account.is_complete,
            TaskError::TaskAlreadyComplete
        );
        require!(
            Clock::get()?.unix_timestamp < self.task_account.deadline,
            TaskError::DeadlinePassed
        );
        **self.creator.try_borrow_mut_lamports()? += self.reward_vault.balance;
        **self
            .reward_vault
            .to_account_info()
            .try_borrow_mut_lamports()? -= self.reward_vault.balance;

        self.reward_vault.balance = 0;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct DisburseRewards<'info> {
    #[account(
        mut,
        constraint = task_account.is_complete @ TaskError::TaskAlreadyComplete
    )]
    pub task_account: Account<'info, TaskAccount>,

    #[account(
        mut,
        seeds = [b"vault", task_account.key().as_ref()],
        bump = reward_vault.bump
    )]
    pub reward_vault: Account<'info, RewardVaultAccount>,

    // Response account to verify the recipient earned rewards
    #[account(
        seeds = [b"response", task_account.key().as_ref(), recipient.key().as_ref()],
        bump = response_account.bump,
        constraint = response_account.is_verified @ TaskError::Unauthorized
    )]
    pub response_account: Account<'info, ResponseAccount>,

    #[account(mut)]
    pub recipient: SystemAccount<'info>,

    // Admin authorization
    #[account(
        seeds = [b"admin"],
        bump = admin_account.bump
    )]
    pub admin_account: Account<'info, AdminAccount>,

    #[account(
        constraint = signer.key() == admin_account.authority @ TaskError::Unauthorized
    )]
    pub signer: Signer<'info>,
}

impl<'info> DisburseRewards<'info> {
    pub fn disburse_rewards(&mut self) -> Result<()> {
        let vault = &mut self.reward_vault;
        let task = &self.task_account;

        // Calculate reward amount automatically
        let reward_amount = task.reward_per_response;

        require!(
            vault.balance >= reward_amount,
            RewardError::InsufficientVaultBalance
        );

        require!(task.is_complete, TaskError::TaskAlreadyComplete);

        require!(self.response_account.is_verified, TaskError::Unauthorized);

        // Transfer reward to recipient
        **self.recipient.try_borrow_mut_lamports()? += reward_amount;
        **vault.to_account_info().try_borrow_mut_lamports()? -= reward_amount;

        vault.balance = vault
            .balance
            .checked_sub(reward_amount)
            .ok_or(RewardError::InsufficientVaultBalance)?;

        msg!(
            "Disbursed {} lamports to {} for verified response",
            reward_amount,
            self.recipient.key()
        );

        Ok(())
    }
}
