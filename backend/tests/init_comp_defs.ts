import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { SavingsMxe } from "../target/types/savings_mxe";
import { randomBytes } from "crypto";
import {
  awaitComputationFinalization,
  getCompDefAccOffset,
  getArciumAccountBaseSeed,
  getArciumProgAddress,
  getMXEAccAddress,
  getCompDefAccAddress,
} from "@arcium-hq/client";
import * as fs from "fs";
import * as os from "os";

// Test script to initialize computation definitions on devnet
// and run a basic computation test

async function main() {
  // Connect to devnet
  const connection = new anchor.web3.Connection(
    "https://api.devnet.solana.com",
    "confirmed"
  );

  const provider = new anchor.AnchorProvider(connection, anchor.Wallet.local(), {
    commitment: "confirmed",
  });

  anchor.setProvider(provider);

  // Load program from IDL file
  const programId = new PublicKey("4rWRT9mgwWdz9GDpsYeZPZ6arBPCsjG2rquAbLpxGa4i");
  const idl = JSON.parse(
    require("fs").readFileSync("./target/idl/savings_mxe.json", "utf8")
  );
  const program = new Program(idl, provider) as Program<SavingsMxe>;

  const owner = anchor.Wallet.local().payer;

  console.log("🚀 Initializing Computation Definitions on Devnet...\n");
  console.log("📝 Program ID:", program.programId.toString());
  console.log("👤 Owner:", owner.publicKey.toString());
  
  // Get MXE account address
  const mxeAccount = getMXEAccAddress(program.programId);
  console.log("🔐 MXE Account:", mxeAccount.toBase58());
  console.log();

  // Initialize computation definitions
  try {
    await initCompDef(program, owner, "add_two_contributions_v4");
    console.log("✅ add_two_contributions_v4 initialized\n");

    await initCompDef(program, owner, "check_goal_reached_v4");
    console.log("✅ check_goal_reached_v4 initialized\n");

    await initCompDef(program, owner, "reveal_contributions_5_v4");
    console.log("✅ reveal_contributions_5_v4 initialized\n");

    await initCompDef(program, owner, "reveal_contributions_10_v4");
    console.log("✅ reveal_contributions_10_v4 initialized\n");

    console.log("\n🎉 All computation definitions initialized successfully!");
    console.log("🚀 Your Arcium MXE is ready for computations on devnet!");
  } catch (error) {
    console.error("\n❌ Error initializing computation definitions:", error);
    throw error;
  }
}

async function initCompDef(
  program: Program<SavingsMxe>,
  owner: anchor.web3.Keypair,
  ixName: "add_two_contributions_v4" | "check_goal_reached_v4" | "reveal_contributions_5_v4" | "reveal_contributions_10_v4"
): Promise<string> {
  // ✅ VVI Pattern: Use SDK helpers for account derivation
  const mxeAccount = getMXEAccAddress(program.programId);
  const compDefOffset = getCompDefAccOffset(ixName);
  const compDefAccount = getCompDefAccAddress(
    program.programId,
    Buffer.from(compDefOffset).readUInt32LE()
  );

  console.log(`⏳ Initializing ${ixName}...`);
  console.log(`  MXE Account: ${mxeAccount.toBase58()}`);
  console.log(`  Comp Def Account: ${compDefAccount.toBase58()}`);

  const method =
    ixName === "add_two_contributions_v4" ? program.methods.initAddTwoContributionsCompDef() :
    ixName === "check_goal_reached_v4" ? program.methods.initCheckGoalReachedCompDef() :
    ixName === "reveal_contributions_5_v4" ? program.methods.initRevealContributions5CompDef() :
    program.methods.initRevealContributions10CompDef();

  // ✅ VVI Pattern: Use .accountsPartial() for better type safety
  const sig = await method
    .accountsPartial({
      mxeAccount: mxeAccount,
      compDefAccount: compDefAccount,
    })
    .signers([owner])
    .rpc({ 
      commitment: "confirmed",
      skipPreflight: true  // Skip simulation for devnet
    });

  console.log(`  ✅ Signature: ${sig}`);
  return sig;
}

 

// ✅ Removed duplicate getCompDefAccAddress - using SDK version instead

function getMempoolAccAddress(programId: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("mempool")],
    programId
  )[0];
}

function getExecutingPoolAccAddress(programId: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("executing_pool")],
    programId
  )[0];
}

function getComputationAccAddress(programId: PublicKey, offset: BN): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("computation"), Buffer.from(offset.toArray("le", 8))],
    programId
  )[0];
}

function readKpJson(path: string): anchor.web3.Keypair {
  const file = fs.readFileSync(path);
  return anchor.web3.Keypair.fromSecretKey(new Uint8Array(JSON.parse(file.toString())));
}

main().catch(console.error);
