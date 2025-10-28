use anchor_lang::prelude::*;
use arcium_anchor::prelude::*;
use anchor_lang::solana_program::pubkey;

// Computation definition offsets for each circuit
// CRITICAL: Must match EXACT #[instruction] function names in encrypted-ixs/src/lib.rs
const COMP_DEF_OFFSET_ADD_TWO: u32 = comp_def_offset("add_two_contributions_v4");
const COMP_DEF_OFFSET_CHECK_GOAL: u32 = comp_def_offset("check_goal_reached_v4");
const COMP_DEF_OFFSET_REVEAL_5: u32 = comp_def_offset("reveal_contributions_5_v4");
const COMP_DEF_OFFSET_REVEAL_10: u32 = comp_def_offset("reveal_contributions_10_v4");

// MXE authority (wallet that initialized the MXE)
const MXE_AUTHORITY: Pubkey = pubkey!("HmxiRU21VKdhgmjSWkujqreCaSayCVW1p9EmtHrvfzoT");

declare_id!("4rWRT9mgwWdz9GDpsYeZPZ6arBPCsjG2rquAbLpxGa4i");

#[arcium_program]
pub mod savings_mxe {
    use super::*;

    // Initialize computation definitions
    pub fn init_add_two_contributions_comp_def(ctx: Context<InitAddTwoCompDef>) -> Result<()> {
        init_comp_def(ctx.accounts, true, 0, None, Some(MXE_AUTHORITY))?;
        Ok(())
    }

    pub fn init_check_goal_reached_comp_def(ctx: Context<InitCheckGoalCompDef>) -> Result<()> {
        init_comp_def(ctx.accounts, true, 0, None, Some(MXE_AUTHORITY))?;
        Ok(())
    }

    pub fn init_reveal_contributions_5_comp_def(ctx: Context<InitReveal5CompDef>) -> Result<()> {
        init_comp_def(ctx.accounts, true, 0, None, Some(MXE_AUTHORITY))?;
        Ok(())
    }

    pub fn init_reveal_contributions_10_comp_def(ctx: Context<InitReveal10CompDef>) -> Result<()> {
        init_comp_def(ctx.accounts, true, 0, None, Some(MXE_AUTHORITY))?;
        Ok(())
    }

    // add_two_contributions - for iterative aggregation
    pub fn add_two_contributions(
        ctx: Context<AddTwoContributions>,
        computation_offset: u64,
        ciphertext_0: [u8; 32],
        ciphertext_1: [u8; 32],
        pub_key: [u8; 32],
        nonce: u128,
    ) -> Result<()> {
        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;
        let args = vec![
            Argument::ArcisPubkey(pub_key),
            Argument::PlaintextU128(nonce),
            Argument::EncryptedU8(ciphertext_0),
            Argument::EncryptedU8(ciphertext_1),
        ];

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            None,
            vec![AddTwoContributionsV4Callback::callback_ix(&[])],
        )?;
        Ok(())
    }

    #[arcium_callback(encrypted_ix = "add_two_contributions_v4")]
    pub fn add_two_contributions_v4_callback(
        ctx: Context<AddTwoContributionsV4Callback>,
        output: ComputationOutputs<AddTwoContributionsV4Output>,
    ) -> Result<()> {
        let result = match output {
            ComputationOutputs::Success(AddTwoContributionsV4Output { field_0 }) => field_0,
            _ => return Err(ErrorCode::AbortedComputation.into()),
        };

        emit!(AggregationEvent {
            total: result,
        });
        Ok(())
    }

    // check_goal_reached - for progress checking
    pub fn check_goal_reached(
        ctx: Context<CheckGoalReached>,
        computation_offset: u64,
        ciphertext_0: [u8; 32],
        target: u64,
        pub_key: [u8; 32],
        nonce: u128,
    ) -> Result<()> {
        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;
        let args = vec![
            Argument::ArcisPubkey(pub_key),
            Argument::PlaintextU128(nonce),
            Argument::EncryptedU8(ciphertext_0),
            Argument::PlaintextU64(target),
        ];

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            None,
            vec![CheckGoalReachedV4Callback::callback_ix(&[])],
        )?;
        Ok(())
    }

    #[arcium_callback(encrypted_ix = "check_goal_reached_v4")]
    pub fn check_goal_reached_v4_callback(
        ctx: Context<CheckGoalReachedV4Callback>,
        output: ComputationOutputs<CheckGoalReachedV4Output>,
    ) -> Result<()> {
        let reached = match output {
            ComputationOutputs::Success(CheckGoalReachedV4Output { field_0 }) => field_0,
            _ => return Err(ErrorCode::AbortedComputation.into()),
        };

        emit!(GoalCheckEvent {
            reached: reached,
        });
        Ok(())
    }
}

// Account Structs
#[queue_computation_accounts("add_two_contributions_v4", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct AddTwoContributions<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        init_if_needed,
        space = 9,
        payer = payer,
        seeds = [&SIGN_PDA_SEED],
        bump,
        address = derive_sign_pda!(),
    )]
    pub sign_pda_account: Account<'info, SignerAccount>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,
    #[account(mut, address = derive_mempool_pda!())]
    /// CHECK: mempool_account
    pub mempool_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_execpool_pda!())]
    /// CHECK: executing_pool
    pub executing_pool: UncheckedAccount<'info>,
    #[account(mut, address = derive_comp_pda!(computation_offset))]
    /// CHECK: computation_account
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_ADD_TWO))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(mut, address = derive_cluster_pda!(mxe_account))]
    pub cluster_account: Account<'info, Cluster>,
    #[account(mut, address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS)]
    pub pool_account: Account<'info, FeePool>,
    #[account(address = ARCIUM_CLOCK_ACCOUNT_ADDRESS)]
    pub clock_account: Account<'info, ClockAccount>,
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
}

#[callback_accounts("add_two_contributions_v4")]
#[derive(Accounts)]
pub struct AddTwoContributionsV4Callback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_ADD_TWO))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions_sysvar
    pub instructions_sysvar: AccountInfo<'info>,
}

#[init_computation_definition_accounts("add_two_contributions_v4", payer)]
#[derive(Accounts)]
pub struct InitAddTwoCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: Will be initialized
    pub comp_def_account: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

#[queue_computation_accounts("check_goal_reached_v4", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct CheckGoalReached<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        init_if_needed,
        space = 9,
        payer = payer,
        seeds = [&SIGN_PDA_SEED],
        bump,
        address = derive_sign_pda!(),
    )]
    pub sign_pda_account: Account<'info, SignerAccount>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,
    #[account(mut, address = derive_mempool_pda!())]
    /// CHECK: mempool_account
    pub mempool_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_execpool_pda!())]
    /// CHECK: executing_pool
    pub executing_pool: UncheckedAccount<'info>,
    #[account(mut, address = derive_comp_pda!(computation_offset))]
    /// CHECK: computation_account
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_CHECK_GOAL))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(mut, address = derive_cluster_pda!(mxe_account))]
    pub cluster_account: Account<'info, Cluster>,
    #[account(mut, address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS)]
    pub pool_account: Account<'info, FeePool>,
    #[account(address = ARCIUM_CLOCK_ACCOUNT_ADDRESS)]
    pub clock_account: Account<'info, ClockAccount>,
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
}

#[callback_accounts("check_goal_reached_v4")]
#[derive(Accounts)]
pub struct CheckGoalReachedV4Callback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_CHECK_GOAL))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions_sysvar
    pub instructions_sysvar: AccountInfo<'info>,
}

#[init_computation_definition_accounts("check_goal_reached_v4", payer)]
#[derive(Accounts)]
pub struct InitCheckGoalCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: Will be initialized
    pub comp_def_account: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

#[init_computation_definition_accounts("reveal_contributions_5_v4", payer)]
#[derive(Accounts)]
pub struct InitReveal5CompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: Will be initialized
    pub comp_def_account: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

#[init_computation_definition_accounts("reveal_contributions_10_v4", payer)]
#[derive(Accounts)]
pub struct InitReveal10CompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: Will be initialized
    pub comp_def_account: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

// Events
#[event]
pub struct AggregationEvent {
    pub total: u64,
}

#[event]
pub struct GoalCheckEvent {
    pub reached: bool,
}

// Error Codes
#[error_code]
pub enum ErrorCode {
    #[msg("The computation was aborted")]
    AbortedComputation,
    #[msg("Cluster not set")]
    ClusterNotSet,
}
