import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { Program } from "@coral-xyz/anchor";
import { SavingsMxe } from "../target/types/savings_mxe";
import * as fs from "fs";

async function main() {
  // Connect to devnet
  const connection = new anchor.web3.Connection("https://devnet.helius-rpc.com/?api-key=1a571cec-6f5e-4cc5-be17-a50dc8c5954a");
  
  // Load IDL  
  const idl = JSON.parse(fs.readFileSync("./target/idl/savings_mxe.json", "utf8"));
  
  // Create read-only provider
  const provider = new anchor.AnchorProvider(connection, {} as any, { commitment: "confirmed" });
  
  // Create program (Anchor v0.31+ uses (idl, provider) constructor)
  const program = new Program(idl, provider) as Program<SavingsMxe>;
  
  console.log("🔍 Analyzing Devnet MXE Account...\n");
  
  const mxeAccount = new PublicKey("6YmsnnM7Ky5fremALz4Fdk9eymwb9quzzaCP2pYLBhDX");
  
  try {
    const mxeData = await program.account.mxeAccount.fetch(mxeAccount);
    
    console.log("✅ MXE Account Data:");
    console.log("   Authority:", mxeData.authority.toBase58());
    console.log("   Cluster:", mxeData.cluster);
    console.log("   x25519Pubkey:", mxeData.x25519Pubkey);
    console.log("   Fallback Clusters:", mxeData.fallbackClusters);
    console.log("   Rejected Clusters:", mxeData.rejectedClusters);
    console.log("   Computation Definitions:", mxeData.computationDefinitions);
    
    // Check if x25519 public key is set
    const x25519Enum = mxeData.x25519Pubkey as any;
    if (x25519Enum.set) {
      console.log("\n✅ MXE Public Key is SET!");
      console.log("   Public Key:", x25519Enum.set);
      console.log("   Length:", x25519Enum.set.length);
      
      // Check if it's all zeros
      const isZero = x25519Enum.set.every((b: number) => b === 0);
      if (isZero) {
        console.log("   ⚠️  WARNING: Public key is all zeros (not initialized properly)");
      } else {
        console.log("   ✅ Public key has valid data");
      }
    } else if (x25519Enum.unset) {
      console.log("\n❌ MXE Public Key is UNSET!");
      console.log("   This means keygen has not been run yet.");
      console.log("   You need to run a keygen computation first.");
    }
    
  } catch (error) {
    console.error("❌ Error fetching MXE account:", error);
  }
}

main().catch(console.error);
