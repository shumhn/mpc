import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, ComputeBudgetProgram } from "@solana/web3.js";
import { SavingsMxe } from "../target/types/savings_mxe";
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
  x25519,
} from "@arcium-hq/client";
import * as fs from "fs";
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
  const program = anchor.workspace.SavingsMxe as Program<SavingsMxe>;

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

  const arciumEnv = getArciumEnv();

  it("initializes computation definitions", async () => {
    const owner = readKpJson(`${os.homedir()}/.config/solana/id.json`);

    await initCompDef(program, owner, "add_two_contributions");
    await initCompDef(program, owner, "check_goal_reached");
  });

  it("aggregates two encrypted values and checks goal", async () => {
    const mxePublicKey = await getMXEPublicKeyWithRetry(provider, program.programId);

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
    const computationOffset = new anchor.BN(randomBytes(8));
    const sumEventPromise = awaitEvent("aggregationEvent");

    const priorityIx = ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50_000 });

    const queueSig = await program.methods
      .addTwoContributions(
        computationOffset,
        Array.from(ciphertext[0]),
        Array.from(ciphertext[1]),
        Array.from(publicKey),
        new anchor.BN(deserializeLE(nonce).toString()),
      )
      .accountsPartial({
        computationAccount: getComputationAccAddress(program.programId, computationOffset),
        clusterAccount: arciumEnv.arciumClusterPubkey,
        mxeAccount: getMXEAccAddress(program.programId),
        mempoolAccount: getMempoolAccAddress(program.programId),
        executingPool: getExecutingPoolAccAddress(program.programId),
        compDefAccount: getCompDefAccAddress(
          program.programId,
          Buffer.from(getCompDefAccOffset("add_two_contributions")).readUInt32LE(),
        ),
      })
      .preInstructions([priorityIx])
      .rpc({ skipPreflight: true, commitment: "confirmed" });

    // Wait for MPC + callback
    const finalizeSig = await awaitComputationFinalization(
      provider,
      computationOffset,
      program.programId,
      "confirmed",
    );

    // Verify aggregation result from callback event
    const agg = await sumEventPromise as any;
    const total = (agg.total as anchor.BN).toNumber();
    expect(total).to.equal(Number(v1 + v2));

    // Now run a goal check against the aggregated total (encrypt single value)
    const nonce2 = randomBytes(16);
    const ciphertext2 = cipher.encrypt([BigInt(total)], nonce2);

    const compOffset2 = new anchor.BN(randomBytes(8));
    const goalEventPromise = awaitEvent("goalCheckEvent");

    await program.methods
      .checkGoalReached(
        compOffset2,
        Array.from(ciphertext2[0]),
        new anchor.BN(total),
        Array.from(publicKey),
        new anchor.BN(deserializeLE(nonce2).toString()),
      )
      .accountsPartial({
        computationAccount: getComputationAccAddress(program.programId, compOffset2),
        clusterAccount: arciumEnv.arciumClusterPubkey,
        mxeAccount: getMXEAccAddress(program.programId),
        mempoolAccount: getMempoolAccAddress(program.programId),
        executingPool: getExecutingPoolAccAddress(program.programId),
        compDefAccount: getCompDefAccAddress(
          program.programId,
          Buffer.from(getCompDefAccOffset("check_goal_reached")).readUInt32LE(),
        ),
      })
      .preInstructions([priorityIx])
      .rpc({ skipPreflight: true, commitment: "confirmed" });

    await awaitComputationFinalization(provider, compOffset2, program.programId, "confirmed");
    const goal = await goalEventPromise as any;
    expect(goal.reached).to.equal(true);
  });
});

async function initCompDef(
  program: Program<SavingsMxe>,
  owner: anchor.web3.Keypair,
  ixName: "add_two_contributions" | "check_goal_reached" | "reveal_contributions_5" | "reveal_contributions_10",
): Promise<string> {
  const baseSeed = getArciumAccountBaseSeed("ComputationDefinitionAccount");
  const offset = getCompDefAccOffset(ixName);
  const compDefPDA = PublicKey.findProgramAddressSync(
    [baseSeed, program.programId.toBuffer(), offset],
    getArciumProgAddress(),
  )[0];

  const method =
    ixName === "add_two_contributions" ? program.methods.initAddTwoContributionsCompDef() :
    ixName === "check_goal_reached" ? program.methods.initCheckGoalReachedCompDef() :
    ixName === "reveal_contributions_5" ? program.methods.initRevealContributions5CompDef() :
    program.methods.initRevealContributions10CompDef();

  const sig = await method
    .accounts({
      compDefAccount: compDefPDA,
      payer: owner.publicKey,
      mxeAccount: getMXEAccAddress(program.programId),
    })
    .signers([owner])
    .rpc({ commitment: "confirmed" });

  return sig;
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
