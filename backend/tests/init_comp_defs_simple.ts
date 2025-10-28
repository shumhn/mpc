import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey, Connection } from "@solana/web3.js";
import { SavingsMxe } from "../target/types/savings_mxe";
import {
  getCompDefAccOffset,
  getMXEAccAddress,
  getCompDefAccAddress,
} from "@arcium-hq/client";

async function main() {
  console.log("🚀 Initializing Computation Definitions on Devnet (Simple Mode)...\n");
  
  // Connect to devnet
  const connection = new Connection(
    "https://api.devnet.solana.com",
    "confirmed"
  );

  const provider = new AnchorProvider(connection, anchor.Wallet.local(), {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
  });

  anchor.setProvider(provider);

  // Load program from IDL file
  const programId = new PublicKey("4rWRT9mgwWdz9GDpsYeZPZ6arBPCsjG2rquAbLpxGa4i");
  const idl = JSON.parse(
    require("fs").readFileSync("./target/idl/savings_mxe.json", "utf8")
  );
  const program = new Program(idl, provider) as Program<SavingsMxe>;

  const owner = anchor.Wallet.local().payer;

  console.log("📝 Program ID:", programId.toString());
  console.log("👤 Owner:", owner.publicKey.toString());
  
  const mxeAccount = getMXEAccAddress(programId);
  console.log("🔐 MXE Account:", mxeAccount.toBase58());
  console.log("");

  // Initialize comp defs one by one
  const compDefs = ["add_two_contributions_v4", "check_goal_reached_v4"] as const;

  for (const ixName of compDefs) {
    console.log(`\n⏳ Processing ${ixName}...`);
    
    const compDefOffset = getCompDefAccOffset(ixName);
    const compDefAccount = getCompDefAccAddress(
      programId,
      Buffer.from(compDefOffset).readUInt32LE(0)
    );

    console.log(`  Comp Def Account: ${compDefAccount.toBase58()}`);

    // Check if already initialized
    const existing = await connection.getAccountInfo(compDefAccount);
    if (existing) {
      console.log(`  ✅ Already initialized!`);
      continue;
    }

    const method =
      ixName === "add_two_contributions_v4" 
        ? program.methods.initAddTwoContributionsCompDef()
        : program.methods.initCheckGoalReachedCompDef();

    try {
      // Send transaction WITHOUT waiting for confirmation
      const tx = await method
        .accountsPartial({
          mxeAccount: mxeAccount,
          compDefAccount: compDefAccount,
        })
        .signers([owner])
        .transaction();

      const signature = await connection.sendTransaction(tx, [owner], {
        skipPreflight: true,
        preflightCommitment: "confirmed",
      });

      console.log(`  📤 Transaction sent: ${signature}`);
      console.log(`  ⏳ Waiting for confirmation (checking every 5s)...`);

      // Poll for confirmation with longer timeout
      let confirmed = false;
      for (let i = 0; i < 12; i++) { // 12 * 5s = 60 seconds total
        await new Promise(r => setTimeout(r, 5000));
        
        const account = await connection.getAccountInfo(compDefAccount);
        if (account) {
          console.log(`  ✅ Confirmed after ${(i+1)*5} seconds!`);
          confirmed = true;
          break;
        }
        console.log(`  ⏳ Still waiting... (${(i+1)*5}s)`);
      }

      if (!confirmed) {
        console.log(`  ⚠️  Confirmation timeout, but account may still be created`);
        console.log(`     Check later: solana account ${compDefAccount.toBase58()} --url devnet`);
      }

    } catch (error: any) {
      console.error(`  ❌ Error:`, error.message || error);
    }
  }

  console.log("\n🎉 Initialization process complete!");
  console.log("   Run the verification below to check final status:\n");
  console.log("   solana account 2mNRC9TJdqLgfM7xYYQLETR74kBwKaVTtknVXgeCNnTz --url devnet");
}

main().catch(console.error);
