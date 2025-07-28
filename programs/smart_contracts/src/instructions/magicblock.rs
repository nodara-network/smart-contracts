use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::{anchor::{commit, delegate}, cpi::DelegateConfig, ephem::commit_and_undelegate_accounts};

use crate::TaskAccount;

#[delegate]
#[derive(Accounts)]
pub struct DelegateTaskAccount {
    pub creator: Signer<'info>,

    /// CHECK: Task account to delegate
    #[account(mut, del)]
    pub task_account: AccountInfo<'info>,
}

impl DelegateTaskAccount<'_> {
    pub fn delegate(&mut self, task_id: u64) -> Result<()> {
        self.delegate_task_account(
            &self.creator,
            &[b"task", self.creator.key().as_ref(), task_id.to_le_bytes().as_ref()],
            DelegateConfig::default(),
        )?;

        Ok(())
    }
}

#[commit]
#[derive(Accounts)]
pub struct UndelegateTaskAccount {
    #[account()]
    pub creator: Signer<'info>,
    
    #[account(
      mut,
      seeds = [b"task", task_account.creator.as_ref(), &task_account.task_id.to_le_bytes()],
      bump = task_account.bump,
    )]
    pub task_account: Account<'info, TaskAccount>,
}

impl UndelegateTaskAccount<'_> {
    pub fn undelegate(&mut self) -> Result<()> {
        commit_and_undelegate_accounts(
          &self.creator, 
          vec![&self.task_account.to_account_info()],
          &self.magic_context, 
          &self.magic_program
        )?;

        Ok(())
    }
}