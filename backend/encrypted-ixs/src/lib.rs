 use arcis_imports::*;

#[encrypted]
mod circuits {
    use arcis_imports::*;

    // ========================
    // Reveal Functions - Decrypt individual contributions after goal completion
    // ========================

    /// Reveal 5 individual encrypted contributions
    #[instruction]
    pub fn reveal_contributions_5_v4(
        c1: Enc<Shared, u64>,
        c2: Enc<Shared, u64>,
        c3: Enc<Shared, u64>,
        c4: Enc<Shared, u64>,
        c5: Enc<Shared, u64>,
    ) -> Enc<Shared, [u64; 5]> {
        let a1 = c1.to_arcis();
        let a2 = c2.to_arcis();
        let a3 = c3.to_arcis();
        let a4 = c4.to_arcis();
        let a5 = c5.to_arcis();
        let results = [a1, a2, a3, a4, a5];
        c1.owner.from_arcis(results)
    }

    /// Reveal 10 individual encrypted contributions
    #[instruction]
    pub fn reveal_contributions_10_v4(
        c1: Enc<Shared, u64>,
        c2: Enc<Shared, u64>,
        c3: Enc<Shared, u64>,
        c4: Enc<Shared, u64>,
        c5: Enc<Shared, u64>,
        c6: Enc<Shared, u64>,
        c7: Enc<Shared, u64>,
        c8: Enc<Shared, u64>,
        c9: Enc<Shared, u64>,
        c10: Enc<Shared, u64>,
    ) -> Enc<Shared, [u64; 10]> {
        let a1 = c1.to_arcis();
        let a2 = c2.to_arcis();
        let a3 = c3.to_arcis();
        let a4 = c4.to_arcis();
        let a5 = c5.to_arcis();
        let a6 = c6.to_arcis();
        let a7 = c7.to_arcis();
        let a8 = c8.to_arcis();
        let a9 = c9.to_arcis();
        let a10 = c10.to_arcis();
        let results = [a1, a2, a3, a4, a5, a6, a7, a8, a9, a10];
        c1.owner.from_arcis(results)
    }

    // ========================
    // Helper Functions
    // ========================

    /// Add two encrypted contributions (for partial aggregation)
    #[instruction]
    pub fn add_two_contributions_v4(
        amount1: Enc<Shared, u64>,
        amount2: Enc<Shared, u64>,
    ) -> u64 {
        let a1 = amount1.to_arcis();
        let a2 = amount2.to_arcis();
        let total = a1 + a2;
        total.reveal()
    }

    /// Check if aggregate exceeds target (for goal completion check)
    #[instruction]
    pub fn check_goal_reached_v4(
        current_total: Enc<Shared, u64>,
        target: u64,
    ) -> bool {
        let total = current_total.to_arcis();
        let reached = total >= target;
        reached.reveal()
    }
}
