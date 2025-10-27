# Secret Savings Club – Frontend Integration Guide

This guide captures the exact client-side steps to interact with the Arcium-powered backend.
It focuses on how to queue computations, await finalization, and (optionally) set priority fees.

## 1) Install dependencies

```bash
# In a Next.js/Node project
npm install @project-serum/anchor @solana/web3.js @arcium-hq/client
```

## 2) Await computation finalization (required)

Unlike normal Solana transactions, Arcium computations complete after MPC execution
and on-chain callback. Use `awaitComputationFinalization` to wait for the entire lifecycle.

```ts
import * as anchor from "@project-serum/anchor";
import { randomBytes } from "crypto";
import { awaitComputationFinalization } from "@arcium-hq/client";

// provider: anchor.AnchorProvider
// program: AnchorProgram client for MXE (savings_mxe)

const computationOffset = new anchor.BN(randomBytes(8));

// Example: add_two_contributions (adapt accounts to your app)
const queueSig = await program.methods
  .addTwoContributions(
    computationOffset,
    ciphertext0,        // [u8;32]
    ciphertext1,        // [u8;32]
    arcisPubKey,        // [u8;32] Arcis shared key
    nonceBigInt,        // u128 as BN or bigint
  )
  .accounts({
    payer: wallet.publicKey,
    signPdaAccount: signPda,           // derive_sign_pda!()
    mxeAccount: mxePda,                // derive_mxe_pda!()
    mempoolAccount: mempoolPda,        // derive_mempool_pda!()
    executingPool: execPoolPda,        // derive_execpool_pda!()
    computationAccount: compPda,       // derive_comp_pda!(offset)
    compDefAccount: compDefAddTwoPda,  // derive_comp_def_pda!(offset const)
    clusterAccount: clusterPda,        // derive_cluster_pda!(mxe)
    poolAccount: feePool,              // ARCIUM_FEE_POOL_ACCOUNT_ADDRESS
    clockAccount: clockPda,            // ARCIUM_CLOCK_ACCOUNT_ADDRESS
    systemProgram: anchor.web3.SystemProgram.programId,
    arciumProgram: arciumProgramId,
  })
  .rpc();

// Wait for MPC execution + on-chain callback finalization
const finalizeSig = await awaitComputationFinalization(
  provider,
  computationOffset,
  program.programId,
  "confirmed" // commitment
);

console.log("Queued:", queueSig);
console.log("Finalized:", finalizeSig);
```

## 3) Optional: Add priority fees for urgent computations

```ts
import { ComputeBudgetProgram } from "@solana/web3.js";

const priorityIx = ComputeBudgetProgram.setComputeUnitPrice({
  microLamports: 50_000, // tune per urgency and network conditions
});

const queueSig = await program.methods
  .checkGoalReached(computationOffset, ciphertextTotal, target, arcisPubKey, nonce)
  .accounts({ /* same shape as above for this ix */ })
  .preInstructions([priorityIx])
  .rpc();
```

## 4) Inputs you must encrypt on the client

- Arcis Shared Public Key (`[u8; 32]`) to target – `arcisPubKey`
- Nonce (`u128`) per ciphertext – `nonce`
- Ciphertexts – match the circuit types:
  - `EncryptedU8` for `add_two_contributions`
  - For reveal/check variants, follow circuit spec in `encrypted-ixs/src/lib.rs`

Use `@arcium-hq/client` (or your crypto helper) to encrypt plaintext into ciphertexts and build the Arcis pubkey/nonce.

## 5) Which circuits/instructions are available

Backend MXE (savings_mxe):
- add_two_contributions(ciphertext0, ciphertext1, arcisPubKey, nonce)
- check_goal_reached(ciphertextTotal, target, arcisPubKey, nonce)
- reveal_contributions_5(...ciphertexts)
- reveal_contributions_10(...ciphertexts)

Business program (savings_goal):
- create_goal, invite_member, add_contribution (stores encrypted payload)
- finalize_and_reveal (after goal reached or deadline)
- request_transfer, approve_transfer (owner-controlled payouts)

## 6) Minimal account resolution cheat-sheet

Most PDAs are derived by the Arcium SDK in the backend. On the client you generally only
need to pass the PDA addresses surfaced by your app, or re-derive with the same seeds if needed.

- `signPdaAccount`: `derive_sign_pda!()`
- `mxeAccount`: `derive_mxe_pda!()`
- `mempoolAccount`: `derive_mempool_pda!()`
- `executingPool`: `derive_execpool_pda!()`
- `computationAccount`: `derive_comp_pda!(computationOffset)`
- `compDefAccount`: `derive_comp_def_pda!(COMP_DEF_OFFSET_*)` per circuit
- `clusterAccount`: `derive_cluster_pda!(mxeAccount)`
- `poolAccount`: `ARCIUM_FEE_POOL_ACCOUNT_ADDRESS`
- `clockAccount`: `ARCIUM_CLOCK_ACCOUNT_ADDRESS`

Your backend already enforces and emits events in callbacks (`AggregationEvent`, `GoalCheckEvent`).
The frontend can subscribe to program logs if desired, but `awaitComputationFinalization` is sufficient.

## 7) Development tips

- Keep outputs < 1KB to avoid needing a callback server (already true for your circuits)
- Use a random 8-byte computation offset per request
- Retry strategy: if finalization signature not found within a timeout, re-query or show pending state
- For reveals, batch UI updates after finalization instead of per-tx

---

This document is the source of truth for wiring the frontend to the Arcium-powered backend. Keep it close to your Next.js app and evolve as you add flows (goal creation, contribution, reveal, payout).
