import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Connection } from "@solana/web3.js";
import { getCompDefAccAddress, getCompDefAccOffset } from "@arcium-hq/client";

async function main() {
  console.log("🔍 Analyzing Computation Definition Account...\n");
  
  const connection = new Connection("https://devnet.helius-rpc.com/?api-key=1a571cec-6f5e-4cc5-be17-a50dc8c5954a");
  const programId = new PublicKey("4rWRT9mgwWdz9GDpsYeZPZ6arBPCsjG2rquAbLpxGa4i");
  
  const compDefName = "add_two_contributions";
  const offset = Buffer.from(getCompDefAccOffset(compDefName)).readUInt32LE(0);
  const compDefAccount = getCompDefAccAddress(programId, offset);
  
  console.log("Computation Definition:", compDefName);
  console.log("Offset:", offset);
  console.log("Account:", compDefAccount.toBase58());
  console.log("");
  
  try {
    const accountInfo = await connection.getAccountInfo(compDefAccount);
    
    if (!accountInfo) {
      console.log("❌ Computation definition does NOT exist!");
      console.log("   You need to run init_comp_defs.ts first!");
      return;
    }
    
    console.log("✅ Computation Definition EXISTS");
    console.log("");
    console.log("Account Details:");
    console.log("   Owner:", accountInfo.owner.toBase58());
    console.log("   Expected Owner: BKck65TgoKRokMjQM3datB9oRwJ8rAj2jxPXvHXUvcL6 (Arcium)");
    
    if (accountInfo.owner.toBase58() !== "BKck65TgoKRokMjQM3datB9oRwJ8rAj2jxPXvHXUvcL6") {
      console.log("   ⚠️  WRONG OWNER!");
    }
    
    console.log("   Data Length:", accountInfo.data.length);
    console.log("   Lamports:", accountInfo.lamports);
    console.log("");
    
    // Check discriminator
    if (accountInfo.data.length >= 8) {
      const discriminator = accountInfo.data.slice(0, 8);
      const discriminatorHex = Buffer.from(discriminator).toString('hex');
      console.log("Discriminator:");
      console.log("   Hex:", discriminatorHex);
      console.log("   Array: [" + Array.from(discriminator).join(', ') + "]");
      console.log("   Expected for ComputationDefinition: f5b0d9ddfd68acc8");
      
      if (discriminatorHex !== "f5b0d9ddfd68acc8") {
        console.log("   ❌ WRONG DISCRIMINATOR!");
        console.log("   This could be causing error 3002!");
      } else {
        console.log("   ✅ Discriminator is CORRECT!");
      }
    }
    
    console.log("");
    console.log("Full Account Data (first 64 bytes):");
    console.log(accountInfo.data.slice(0, 64).toString('hex'));
    
    // Try to parse the account data structure
    console.log("");
    console.log("Attempting to parse account structure:");
    let offset_bytes = 8; // Skip discriminator
    
    // Read callback program (32 bytes)
    const callbackProgram = new PublicKey(accountInfo.data.slice(offset_bytes, offset_bytes + 32));
    console.log("   Callback Program:", callbackProgram.toBase58());
    console.log("   Expected:", programId.toBase58());
    
    if (callbackProgram.toBase58() !== programId.toBase58()) {
      console.log("   ⚠️  MISMATCH! This could be the issue!");
    }
    
  } catch (error: any) {
    console.error("❌ Error analyzing account:", error.message);
  }
}

main().catch(console.error);
