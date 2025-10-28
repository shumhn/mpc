# MXE Testing Guide

## Overview
This guide explains how to properly test the Arcium MXE program with the current program ID: `4rWRT9mgwWdz9GDpsYeZPZ6arBPCsjG2rquAbLpxGa4i`

## Critical Understanding

### Why We Don't Pre-load MXE Account
The MXE account **MUST NOT** be pre-loaded from an artifact because:
1. Arcium's keygen process initializes the MXE account with proper Anchor discriminators
2. Pre-loading causes "AccountNotInitialized" errors due to discriminator mismatches
3. The MXE account structure is complex and must be created by the Arcium program

### Current Configuration
- **Program ID**: `4rWRT9mgwWdz9GDpsYeZPZ6arBPCsjG2rquAbLpxGa4i`
- **MXE PDA**: `6YmsnnM7Ky5fremALz4Fdk9eymwb9quzzaCP2pYLBhDX` (derived from program ID)
- **Cluster**: `GgSqqAyH7AVY3Umcv8NvncrjFaNJuQLmxzxFxPoPW2Yd` (cluster_0 from artifacts)

## Testing on Localnet

### Step 1: Clean Start
```bash
# Clean up any stale state
rm -f test-ledger -rf
pkill -f solana-test-validator
pkill -f arcium
```

### Step 2: Run Tests with Arcium
```bash
arcium test
```

This command will:
1. Start a fresh Solana validator
2. Load Arcium program and supporting accounts (cluster, circuits, etc.)
3. Start Arcium MPC nodes
4. Run the test suite which will:
   - Initialize MXE through keygen (first time only)
   - Initialize computation definitions
   - Execute MPC computations

### What Happens During First Run
1. **MXE Initialization**: The Arcium SDK will detect that MXE doesn't exist and initialize it
2. **Keygen**: MXE public key will be generated through MPC
3. **Comp Def Initialization**: Test will initialize computation definitions with correct callback program ID

### Subsequent Runs
- MXE will already be initialized (state persists in test-ledger)
- Computation definitions will be idempotent (skip if already exist)
- Tests should run faster

## Testing on Devnet

### Prerequisites
1. Solana CLI configured for devnet
2. Wallet with SOL for transactions
3. ARX tokens for MPC compute fees

### Initialize MXE on Devnet (One-time)
```bash
# Run the keygen initialization script
npx ts-node tests/init_mxe_keygen.ts
```

### Initialize Computation Definitions
```bash
# Run the comp def initialization script
npx ts-node tests/init_comp_defs.ts
```

### Run Devnet Tests
```bash
# Set Anchor to use devnet
export ANCHOR_PROVIDER_URL=https://api.devnet.solana.com

# Run tests
anchor test --skip-local-validator
```

## Common Issues and Solutions

### Issue: "AccountNotInitialized" for MXE
**Cause**: MXE account doesn't exist or has wrong discriminator
**Solution**: 
- On localnet: Let Arcium SDK initialize it (don't pre-load)
- On devnet: Run `npx ts-node tests/init_mxe_keygen.ts`

### Issue: Computation definition has wrong callback program
**Cause**: Comp defs were initialized with old program ID
**Solution**:
- On localnet: Delete test-ledger and restart: `rm -rf test-ledger && arcium test`
- On devnet: Comp defs are immutable PDAs; must use new offsets or wait for cleanup

### Issue: "Unknown action 'undefined'"
**Cause**: Transaction building error, usually due to missing accounts
**Solution**: Ensure all required accounts exist and are properly initialized

### Issue: MXE public key not set
**Cause**: Keygen hasn't run yet
**Solution**: Run keygen computation to initialize MXE public key

## Verification Commands

### Check MXE Account Status
```bash
npx ts-node -e "
import { Connection, PublicKey } from '@solana/web3.js';
import { getMXEAccAddress } from '@arcium-hq/client';

const conn = new Connection('http://127.0.0.1:8899', 'confirmed');
const programId = new PublicKey('4rWRT9mgwWdz9GDpsYeZPZ6arBPCsjG2rquAbLpxGa4i');
const mxeAddr = getMXEAccAddress(programId);

conn.getAccountInfo(mxeAddr).then(acc => {
  console.log('MXE Address:', mxeAddr.toBase58());
  console.log('Exists:', acc !== null);
  if (acc) {
    console.log('Owner:', acc.owner.toBase58());
    console.log('Data length:', acc.data.length);
  }
});
"
```

### Check Computation Definition
```bash
npx ts-node -e "
import { Connection, PublicKey } from '@solana/web3.js';
import { getCompDefAccAddress } from '@arcium-hq/client';

const conn = new Connection('http://127.0.0.1:8899', 'confirmed');
const programId = new PublicKey('4rWRT9mgwWdz9GDpsYeZPZ6arBPCsjG2rquAbLpxGa4i');
const compDefAddr = getCompDefAccAddress(programId, 2910679823); // add_two_contributions offset

conn.getAccountInfo(compDefAddr).then(acc => {
  console.log('CompDef Address:', compDefAddr.toBase58());
  console.log('Exists:', acc !== null);
});
"
```

## Files Modified
- ✅ `Anchor.toml`: Removed MXE account pre-loading
- ✅ `artifacts/mxe_acc.json`: Updated with correct address (but not used for pre-loading)
- ✅ `scripts/fix_mxe_artifact.ts`: Script to fix MXE artifact address
- ✅ `scripts/clean_comp_defs.sh`: Script to clean old comp def artifacts

## Next Steps
1. Run `arcium test` to execute the full test suite
2. Monitor for any remaining issues
3. Deploy to devnet when localnet tests pass
