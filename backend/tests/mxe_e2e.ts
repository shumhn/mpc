import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, ComputeBudgetProgram } from "@solana/web3.js";
import BN from "bn.js";
import { SavingsMxe } from "../target/types/savings_mxe";
import * as fs from "fs";
const idl = JSON.parse(fs.readFileSync("./target/idl/savings_mxe.json", "utf8"));
import { randomBytes } from "crypto";
import {
  awaitComputationFinalization,
  getArciumEnv,
  getCompDefAccOffset,
  getArciumAccountBaseSeed,
  getArciumProgAddress,
  RescueCipher,
  deserializeLE,
  getMXEPublicKey,
  getMXEAccAddress,
  getMempoolAccAddress,
  getCompDefAccAddress,
  getExecutingPoolAccAddress,
  getComputationAccAddress,
  getClusterAccAddress,
  getClockAccAddress,
  getStakingPoolAccAddress,
  x25519,
  ARCIUM_ADDR,
} from "@arcium-hq/client";
import * as os from "os";
import { expect } from "chai";

// This test exercises the current, supported MXE flows:
// - init computation definitions for add_two_contributions & check_goal_reached
// - queue add_two_contributions with two encrypted u8s
// - wait for MPC finalization and verify callback event value
// - queue check_goal_reached against an encrypted total and target

describe("MXE E2E", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider() as anchor.AnchorProvider;
  
  // Use workspace to automatically get correct IDL
  const program = anchor.workspace.SavingsMxe as anchor.Program<SavingsMxe>;

  type Event = anchor.IdlEvents<(typeof program)["idl"]>;
  const awaitEvent = async <E extends keyof Event>(eventName: E): Promise<Event[E]> => {
    let listenerId: number;
    const event = await new Promise<Event[E]>((res) => {
      listenerId = program.addEventListener(eventName, (event) => {
        res(event);
      });
    });
    await program.removeEventListener(listenerId);
    return event;
  };

  // Use localnet cluster (cluster_0 from artifacts)
  const arciumClusterPubkey = getClusterAccAddress(0);

  it("initializes MXE and computation definitions", async () => {
    const walletPath = process.env.ANCHOR_WALLET || `${os.homedir()}/.config/solana/id.json`;
    const owner = readKpJson(walletPath);

    // Step 1: Initialize MXE via keygen (if not already initialized)
    // This MUST happen before initializing computation definitions
    console.log("\n🔐 Step 1: Initializing MXE via keygen...");
    try {
      const mxePublicKey = await getMXEPublicKey(provider, program.programId);
      console.log("✅ MXE initialized with public key:", Buffer.from(mxePublicKey).toString('hex'));
    } catch (error: any) {
      console.error("❌ MXE initialization failed:", error.message);
      throw error;
    }

    // Step 2: Initialize computation definitions (requires MXE to exist)
    console.log("\n📋 Step 2: Initializing computation definitions...");
    await initCompDef(program, owner, "add_two_contributions_v4");
    await initCompDef(program, owner, "check_goal_reached_v4");
    console.log("✅ Computation definitions initialized\n");
  }).timeout(180000); // 3 minutes for Arcium MPC transactions

  it("aggregates two encrypted values and checks goal", async () => {
    // Use MXE account derived from program ID (works on localnet)
    const mxeAccount = getMXEAccAddress(program.programId);
    
    // Get MXE public key from localnet
    console.log("📋 Fetching MXE public key from localnet...");
    const mxePublicKey = await getMXEPublicKey(provider, program.programId);
    console.log("✅ MXE Public Key:", Buffer.from(mxePublicKey).toString('hex'));
    console.log("");

    // Build X25519 shared secret to encrypt two small u8 values
    const privateKey = x25519.utils.randomSecretKey();
    const publicKey = x25519.getPublicKey(privateKey);
    const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey);
    const cipher = new RescueCipher(sharedSecret);

    const v1 = BigInt(7);
    const v2 = BigInt(5);
    const nonce = randomBytes(16);
    const ciphertext = cipher.encrypt([v1, v2], nonce);

    // Prepare accounts (PDAs) and args for add_two_contributions
    const computationOffset = new BN(randomBytes(8));
    const sumEventPromise = awaitEvent("aggregationEvent");

    const priorityIx = ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50_000 });

    let queueSig: string | undefined;
    try {
      const accounts = {
        computationAccount: getComputationAccAddress(program.programId, computationOffset),
        clusterAccount: arciumClusterPubkey,
        mxeAccount: mxeAccount,
        mempoolAccount: getMempoolAccAddress(program.programId),
        executingPool: getExecutingPoolAccAddress(program.programId),
        compDefAccount: getCompDefAccAddress(
          program.programId,
          Buffer.from(getCompDefAccOffset("add_two_contributions_v4" as any)).readUInt32LE(0),
        ),
        signPdaAccount: getSignPdaAddress(program.programId),
        poolAccount: getStakingPoolAccAddress(), // Fee pool
        clockAccount: getClockAccAddress(),
        systemProgram: anchor.web3.SystemProgram.programId,
        arciumProgram: ARCIUM_ADDR,
      };
      
      console.log("\n📋 Account Addresses for add_two_contributions:");
      console.log("  computationOffset:", computationOffset.toString());
      console.log("  computationAccount:", accounts.computationAccount.toBase58());
      console.log("  clusterAccount:", accounts.clusterAccount.toBase58());
      console.log("  mxeAccount:", accounts.mxeAccount.toBase58());
      console.log("  mempoolAccount:", accounts.mempoolAccount.toBase58());
      console.log("  executingPool:", accounts.executingPool.toBase58());
      console.log("  compDefAccount:", accounts.compDefAccount.toBase58());
      console.log("  signPdaAccount:", accounts.signPdaAccount.toBase58());
      console.log("");

      queueSig = await program.methods
        .addTwoContributions(
          computationOffset,
          Array.from(ciphertext[0]),
          Array.from(ciphertext[1]),
          Array.from(publicKey),
          new BN(deserializeLE(nonce).toString()),
        )
        .accountsPartial(accounts)
        .preInstructions([priorityIx])
        .rpc({ skipPreflight: true, commitment: "confirmed" });
    } catch (e: any) {
      console.error("add_two_contributions RPC failed:", e?.message || e);
      const logs = await tryGetLogs(e);
      if (logs) console.error("Program logs:\n", logs.join("\n"));
      throw e;
    }

    // Wait for MPC + callback
    const finalizeSig = await awaitComputationFinalization(
      provider,
      computationOffset,
      program.programId,
      "confirmed",
    );

    // Verify aggregation result from callback event
    const agg = await sumEventPromise as any;
    const total = (agg.total as BN).toNumber();
    expect(total).to.equal(Number(v1 + v2));

    // Now run a goal check against the aggregated total (encrypt single value)
    const nonce2 = randomBytes(16);
    const ciphertext2 = cipher.encrypt([BigInt(total)], nonce2);

    const compOffset2 = new BN(randomBytes(8));
    const goalEventPromise = awaitEvent("goalCheckEvent");

    try {
      await program.methods
        .checkGoalReached(
          compOffset2,
          Array.from(ciphertext2[0]),
          new BN(total),
          Array.from(publicKey),
          new BN(deserializeLE(nonce2).toString()),
        )
        .accountsPartial({
          computationAccount: getComputationAccAddress(program.programId, compOffset2),
          clusterAccount: arciumClusterPubkey,
          mxeAccount: mxeAccount,
          mempoolAccount: getMempoolAccAddress(program.programId),
          executingPool: getExecutingPoolAccAddress(program.programId),
          compDefAccount: getCompDefAccAddress(
            program.programId,
            Buffer.from(getCompDefAccOffset("check_goal_reached_v4" as any)).readUInt32LE(0),
          ),
          signPdaAccount: getSignPdaAddress(program.programId),
          poolAccount: getStakingPoolAccAddress(),
          clockAccount: getClockAccAddress(),
          systemProgram: anchor.web3.SystemProgram.programId,
          arciumProgram: ARCIUM_ADDR,
        })
        .preInstructions([priorityIx])
        .rpc({ skipPreflight: true, commitment: "confirmed" });
    } catch (e: any) {
      console.error("check_goal_reached RPC failed:", e?.message || e);
      const logs = await tryGetLogs(e);
      if (logs) console.error("Program logs:\n", logs.join("\n"));
      throw e;
    }

    await awaitComputationFinalization(provider, compOffset2, program.programId, "confirmed");
    const goal = await goalEventPromise as any;
    expect(goal.reached).to.equal(true);
  });
});

async function initCompDef(
  program: Program<SavingsMxe>,
  owner: anchor.web3.Keypair,
  ixName: "add_two_contributions_v4" | "check_goal_reached_v4" | "reveal_contributions_5_v4" | "reveal_contributions_10_v4"
): Promise<string> {
  // Use SDK helpers for account derivation (like init_comp_defs.ts)
  const mxeAccount = getMXEAccAddress(program.programId);
  const compDefOffset = getCompDefAccOffset(ixName);
  const compDefAccount = getCompDefAccAddress(
    program.programId,
    Buffer.from(compDefOffset).readUInt32LE(0)
  );

  // Idempotency: if comp-def account already exists, skip initialization
  const existing = await program.provider.connection.getAccountInfo(compDefAccount);
  if (existing) {
    console.log(`✅ ${ixName} already initialized (skipping)`);
    return "already-initialized";
  }

  const method =
    ixName === "add_two_contributions_v4" ? program.methods.initAddTwoContributionsCompDef() :
    ixName === "check_goal_reached_v4" ? program.methods.initCheckGoalReachedCompDef() :
    ixName === "reveal_contributions_5_v4" ? program.methods.initRevealContributions5CompDef() :
    program.methods.initRevealContributions10CompDef();

  // Use .accountsPartial() pattern like init_comp_defs.ts (CRITICAL for Arcium!)
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const sig = await method
        .accountsPartial({
          mxeAccount: mxeAccount,
          compDefAccount: compDefAccount,
        })
        .signers([owner])
        .rpc({ 
          commitment: "confirmed",
          skipPreflight: true,
          // Increase timeout for Arcium MPC transactions (they take longer)
          maxRetries: 5,
        });
      
      console.log(`✅ Initialized ${ixName} (attempt ${attempt}): ${sig}`);
      
      // Wait a bit for confirmation
      await new Promise(r => setTimeout(r, 2000));
      
      // Verify the account was created
      const confirmed = await program.provider.connection.getAccountInfo(compDefAccount);
      if (confirmed) {
        console.log(`✅ Confirmed: ${ixName} comp def account exists`);
        return sig;
      } else {
        throw new Error("Transaction sent but account not found - may need more time");
      }
    } catch (error: any) {
      lastError = error;
      
      // Check if account exists despite timeout
      const exists = await program.provider.connection.getAccountInfo(compDefAccount);
      if (exists) {
        console.log(`✅ ${ixName} initialized despite timeout error`);
        return "success-despite-timeout";
      }
      
      console.log(`⚠️  Attempt ${attempt} failed:`, error.message || error);
      if (attempt < 3) {
        console.log(`   Retrying in 2 seconds...`);
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  }
  
  // Final check - maybe transaction succeeded but confirmation timed out
  const finalCheck = await program.provider.connection.getAccountInfo(compDefAccount);
  if (finalCheck) {
    console.log(`✅ ${ixName} eventually confirmed (found on final check)`);
    return "success-after-retries";
  }
  
  throw lastError;
}

async function getMXEPublicKeyWithRetry(
  provider: anchor.AnchorProvider,
  programId: PublicKey,
  maxRetries: number = 10,
  retryDelayMs: number = 500,
): Promise<Uint8Array> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const mxePublicKey = await getMXEPublicKey(provider, programId);
      if (mxePublicKey) return mxePublicKey;
    } catch (e) {
      console.log(`Attempt ${attempt} failed to fetch MXE public key:`, e);
    }
    if (attempt < maxRetries) {
      await new Promise((r) => setTimeout(r, retryDelayMs));
    }
  }
  throw new Error(`Failed to fetch MXE public key after ${maxRetries} attempts`);
}

function readKpJson(path: string): anchor.web3.Keypair {
  const file = fs.readFileSync(path);
  return anchor.web3.Keypair.fromSecretKey(new Uint8Array(JSON.parse(file.toString())));
}

function getSignPdaAddress(programId: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("sign_pda")],
    programId
  )[0];
}

async function tryGetLogs(e: any): Promise<string[] | null> {
  try {
    if (e && typeof e.getLogs === "function") {
      const logs = await e.getLogs();
      return logs || null;
    }
    if (e && e.logs) return e.logs;
  } catch (_) {}
  return null;
}
