use anchor_lang::prelude::*;

declare_id!("7yqGsfLu8hYo4ugmTC43KR8iTY7JxtLFeCoSDoRkMY47");

#[program]
pub mod savings_goal {
    use super::*;

    /// Create a new savings goal
    pub fn create_goal(
        ctx: Context<CreateGoal>,
        goal_id: u64,
        name: String,
        target_amount: u64,
        deadline: Option<i64>,
    ) -> Result<()> {
        require!(name.len() <= 50, ErrorCode::NameTooLong);
        require!(target_amount > 0, ErrorCode::InvalidTargetAmount);
        
        if let Some(deadline_ts) = deadline {
            let current_time = Clock::get()?.unix_timestamp;
            require!(deadline_ts > current_time, ErrorCode::InvalidDeadline);
        }

        let goal = &mut ctx.accounts.goal;
        let clock = Clock::get()?;

        goal.goal_id = goal_id;
        goal.owner = ctx.accounts.owner.key();
        goal.name = name.clone();
        goal.target_amount = target_amount;
        goal.current_total = 0;
        goal.deadline = deadline;
        goal.members = vec![ctx.accounts.owner.key()];
        goal.status = GoalStatus::Active;
        goal.created_at = clock.unix_timestamp;
        goal.finalized_at = None;

        emit!(GoalCreated {
            goal_id,
            owner: ctx.accounts.owner.key(),
            name,
            target_amount,
            deadline,
        });

        Ok(())
    }

    /// Invite a member to join the goal
    pub fn invite_member(
        ctx: Context<InviteMember>,
    ) -> Result<()> {
        let goal = &mut ctx.accounts.goal;
        let member_wallet = ctx.accounts.member_wallet.key();

        require!(
            !goal.members.contains(&member_wallet),
            ErrorCode::MemberAlreadyExists
        );

        require!(goal.members.len() < 10, ErrorCode::MaxMembersReached);

        goal.members.push(member_wallet);

        emit!(MemberInvited {
            goal_id: goal.goal_id,
            member: member_wallet,
        });

        Ok(())
    }

    /// Add an encrypted contribution
    pub fn add_contribution(
        ctx: Context<AddContribution>,
        encrypted_amount: [u8; 32],
        nonce: [u8; 16],
    ) -> Result<()> {
        let goal = &mut ctx.accounts.goal;
        
        require!(goal.status == GoalStatus::Active, ErrorCode::GoalNotActive);
        
        // Store encrypted contribution
        let contribution = &mut ctx.accounts.contribution;
        contribution.goal_id = goal.goal_id;
        contribution.contributor = ctx.accounts.contributor.key();
        contribution.encrypted_amount = encrypted_amount;
        contribution.nonce = nonce;
        contribution.timestamp = Clock::get()?.unix_timestamp;

        emit!(ContributionAdded {
            goal_id: goal.goal_id,
            contributor: ctx.accounts.contributor.key(),
            timestamp: contribution.timestamp,
        });

        Ok(())
    }

    /// Finalize goal and reveal contributions (when goal reached OR deadline passed)
    pub fn finalize_and_reveal(
        ctx: Context<FinalizeAndReveal>,
    ) -> Result<()> {
        let goal = &mut ctx.accounts.goal;
        let clock = Clock::get()?;

        let goal_reached = goal.current_total >= goal.target_amount;
        let deadline_passed = if let Some(deadline) = goal.deadline {
            clock.unix_timestamp >= deadline
        } else {
            false
        };

        require!(
            goal_reached || deadline_passed,
            ErrorCode::CannotFinalizeYet
        );

        require!(
            goal.status != GoalStatus::Finalized,
            ErrorCode::AlreadyFinalized
        );

        goal.status = GoalStatus::Finalized;
        goal.finalized_at = Some(clock.unix_timestamp);

        emit!(GoalFinalized {
            goal_id: goal.goal_id,
            finalized_at: clock.unix_timestamp,
            goal_reached,
        });

        Ok(())
    }

    /// Request a transfer from the vault (owner only)
    pub fn request_transfer(
        ctx: Context<RequestTransfer>,
        recipient: Pubkey,
        amount: u64,
    ) -> Result<()> {
        let goal = &ctx.accounts.goal;

        require!(
            goal.status == GoalStatus::Finalized,
            ErrorCode::GoalNotFinalized
        );

        let transfer_request = &mut ctx.accounts.transfer_request;
        transfer_request.goal_id = goal.goal_id;
        transfer_request.recipient = recipient;
        transfer_request.amount = amount;
        transfer_request.requested_at = Clock::get()?.unix_timestamp;
        transfer_request.approved = false;

        emit!(TransferRequested {
            goal_id: goal.goal_id,
            recipient,
            amount,
        });

        Ok(())
    }

    /// Approve and execute transfer (owner only)
    pub fn approve_transfer(
        ctx: Context<ApproveTransfer>,
    ) -> Result<()> {
        let goal = &ctx.accounts.goal;
        let transfer_request = &mut ctx.accounts.transfer_request;

        require!(
            goal.status == GoalStatus::Finalized,
            ErrorCode::GoalNotFinalized
        );

        require!(
            !transfer_request.approved,
            ErrorCode::TransferAlreadyApproved
        );

        let vault_balance = ctx.accounts.vault.lamports();
        require!(
            vault_balance >= transfer_request.amount,
            ErrorCode::InsufficientVaultBalance
        );

        **ctx.accounts.vault.try_borrow_mut_lamports()? -= transfer_request.amount;
        **ctx.accounts.recipient.try_borrow_mut_lamports()? += transfer_request.amount;

        transfer_request.approved = true;

        emit!(TransferCompleted {
            goal_id: goal.goal_id,
            recipient: transfer_request.recipient,
            amount: transfer_request.amount,
        });

        Ok(())
    }
}

// ============================================================================
// Account Structs
// ============================================================================

#[derive(Accounts)]
#[instruction(goal_id: u64)]
pub struct CreateGoal<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        init,
        payer = owner,
        space = 8 + 8 + 32 + 50 + 8 + 8 + 9 + 320 + 1 + 8 + 9,
        seeds = [b"goal", owner.key().as_ref(), &goal_id.to_le_bytes()],
        bump
    )]
    pub goal: Account<'info, SavingsGoal>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InviteMember<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        mut,
        constraint = goal.owner == owner.key() @ ErrorCode::Unauthorized
    )]
    pub goal: Account<'info, SavingsGoal>,
    /// CHECK: member wallet
    pub member_wallet: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct AddContribution<'info> {
    #[account(mut)]
    pub contributor: Signer<'info>,
    #[account(mut)]
    pub goal: Account<'info, SavingsGoal>,
    #[account(
        init,
        payer = contributor,
        space = 8 + 8 + 32 + 32 + 16 + 8,
        seeds = [b"contribution", goal.key().as_ref(), contributor.key().as_ref()],
        bump
    )]
    pub contribution: Account<'info, Contribution>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FinalizeAndReveal<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        mut,
        constraint = goal.owner == owner.key() @ ErrorCode::Unauthorized
    )]
    pub goal: Account<'info, SavingsGoal>,
}

#[derive(Accounts)]
pub struct RequestTransfer<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        constraint = goal.owner == owner.key() @ ErrorCode::Unauthorized
    )]
    pub goal: Account<'info, SavingsGoal>,
    #[account(
        init,
        payer = owner,
        space = 8 + 8 + 32 + 8 + 8 + 1,
        seeds = [b"transfer", goal.key().as_ref()],
        bump
    )]
    pub transfer_request: Account<'info, TransferRequest>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ApproveTransfer<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        constraint = goal.owner == owner.key() @ ErrorCode::Unauthorized
    )]
    pub goal: Account<'info, SavingsGoal>,
    #[account(
        mut,
        seeds = [b"transfer", goal.key().as_ref()],
        bump
    )]
    pub transfer_request: Account<'info, TransferRequest>,
    #[account(
        mut,
        seeds = [b"vault", goal.key().as_ref()],
        bump
    )]
    /// CHECK: vault PDA
    pub vault: AccountInfo<'info>,
    #[account(mut)]
    /// CHECK: recipient
    pub recipient: AccountInfo<'info>,
}

// ============================================================================
// Data Structures
// ============================================================================

#[account]
pub struct SavingsGoal {
    pub goal_id: u64,
    pub owner: Pubkey,
    pub name: String,
    pub target_amount: u64,
    pub current_total: u64,
    pub deadline: Option<i64>,
    pub members: Vec<Pubkey>,
    pub status: GoalStatus,
    pub created_at: i64,
    pub finalized_at: Option<i64>,
}

#[account]
pub struct Contribution {
    pub goal_id: u64,
    pub contributor: Pubkey,
    pub encrypted_amount: [u8; 32],
    pub nonce: [u8; 16],
    pub timestamp: i64,
}

#[account]
pub struct TransferRequest {
    pub goal_id: u64,
    pub recipient: Pubkey,
    pub amount: u64,
    pub requested_at: i64,
    pub approved: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum GoalStatus {
    Active,
    Finalized,
}

// ============================================================================
// Events
// ============================================================================

#[event]
pub struct GoalCreated {
    pub goal_id: u64,
    pub owner: Pubkey,
    pub name: String,
    pub target_amount: u64,
    pub deadline: Option<i64>,
}

#[event]
pub struct MemberInvited {
    pub goal_id: u64,
    pub member: Pubkey,
}

#[event]
pub struct ContributionAdded {
    pub goal_id: u64,
    pub contributor: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct GoalFinalized {
    pub goal_id: u64,
    pub finalized_at: i64,
    pub goal_reached: bool,
}

#[event]
pub struct TransferRequested {
    pub goal_id: u64,
    pub recipient: Pubkey,
    pub amount: u64,
}

#[event]
pub struct TransferCompleted {
    pub goal_id: u64,
    pub recipient: Pubkey,
    pub amount: u64,
}

// ============================================================================
// Error Codes
// ============================================================================

#[error_code]
pub enum ErrorCode {
    #[msg("Goal name is too long (max 50 characters)")]
    NameTooLong,
    #[msg("Target amount must be greater than zero")]
    InvalidTargetAmount,
    #[msg("Deadline must be in the future")]
    InvalidDeadline,
    #[msg("Only the goal owner can perform this action")]
    Unauthorized,
    #[msg("Goal is not active")]
    GoalNotActive,
    #[msg("Member already exists in this goal")]
    MemberAlreadyExists,
    #[msg("Maximum number of members reached (10)")]
    MaxMembersReached,
    #[msg("Cannot finalize yet - goal not reached and deadline not passed")]
    CannotFinalizeYet,
    #[msg("Goal already finalized")]
    AlreadyFinalized,
    #[msg("Goal not finalized yet")]
    GoalNotFinalized,
    #[msg("Transfer already approved")]
    TransferAlreadyApproved,
    #[msg("Insufficient vault balance")]
    InsufficientVaultBalance,
}
