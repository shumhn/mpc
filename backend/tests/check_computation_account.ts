import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Connection } from "@solana/web3.js";
import { getComputationAccAddress } from "@arcium-hq/client";
import BN from "bn.js";

async function main() {
  console.log("🔍 Checking Computation Account State...\n");
  
  const connection = new Connection("https://devnet.helius-rpc.com/?api-key=1a571cec-6f5e-4cc5-be17-a50dc8c5954a");
  const programId = new PublicKey("4rWRT9mgwWdz9GDpsYeZPZ6arBPCsjG2rquAbLpxGa4i");
  
  // Use the same computation offset that the test uses
  const computationOffset = new BN(Date.now().toString());
  const computationAccount = getComputationAccAddress(programId, computationOffset);
  
  console.log("Computation Offset:", computationOffset.toString());
  console.log("Computation Account:", computationAccount.toBase58());
  console.log("");
  
  try {
    const accountInfo = await connection.getAccountInfo(computationAccount);
    
    if (!accountInfo) {
      console.log("✅ Computation account does NOT exist yet (good!)");
      console.log("   This means it will be created fresh during the transaction.");
      return;
    }
    
    console.log("⚠️  Computation account ALREADY EXISTS!");
    console.log("   This might be causing the discriminator mismatch!");
    console.log("");
    console.log("Account Details:");
    console.log("   Owner:", accountInfo.owner.toBase58());
    console.log("   Data Length:", accountInfo.data.length);
    console.log("   Lamports:", accountInfo.lamports);
    
    if (accountInfo.data.length >= 8) {
      const discriminator = accountInfo.data.slice(0, 8);
      console.log("   Discriminator:", Buffer.from(discriminator).toString('hex'));
      console.log("   Discriminator Array: [" + Array.from(discriminator).join(', ') + "]");
    }
    
    console.log("");
    console.log("🔧 Recommendation:");
    console.log("   If this account has wrong data, you need to:");
    console.log("   1. Use a different computation offset");
    console.log("   2. Or close/reinitialize this account");
    
  } catch (error: any) {
    console.error("Error checking account:", error.message);
  }
}

main().catch(console.error);
