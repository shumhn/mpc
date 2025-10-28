import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Connection } from "@solana/web3.js";
import {
  getClusterAccAddress,
  getMempoolAccAddress,
  getExecutingPoolAccAddress,
  getCompDefAccAddress,
  getCompDefAccOffset,
  getStakingPoolAccAddress,
  getClockAccAddress,
} from "@arcium-hq/client";

async function main() {
  console.log("🔍 Verifying Account Discriminators on Devnet...\n");
  
  const connection = new Connection("https://devnet.helius-rpc.com/?api-key=1a571cec-6f5e-4cc5-be17-a50dc8c5954a");
  const programId = new PublicKey("4rWRT9mgwWdz9GDpsYeZPZ6arBPCsjG2rquAbLpxGa4i");
  
  const accounts = {
    mxeAccount: new PublicKey("6YmsnnM7Ky5fremALz4Fdk9eymwb9quzzaCP2pYLBhDX"),
    clusterAccount: getClusterAccAddress(1078779259),
    mempoolAccount: getMempoolAccAddress(programId),
    executingPool: getExecutingPoolAccAddress(programId),
    compDefAccount: getCompDefAccAddress(
      programId,
      Buffer.from(getCompDefAccOffset("add_two_contributions")).readUInt32LE(0)
    ),
    poolAccount: getStakingPoolAccAddress(),
    clockAccount: getClockAccAddress(),
  };
  
  console.log("📋 Checking Accounts:\n");
  
  for (const [name, pubkey] of Object.entries(accounts)) {
    try {
      const accountInfo = await connection.getAccountInfo(pubkey);
      
      if (!accountInfo) {
        console.log(`❌ ${name}: ${pubkey.toBase58()}`);
        console.log(`   Account does NOT exist on devnet!`);
        console.log("");
        continue;
      }
      
      const discriminator = accountInfo.data.slice(0, 8);
      const discriminatorHex = Buffer.from(discriminator).toString('hex');
      
      console.log(`✅ ${name}: ${pubkey.toBase58()}`);
      console.log(`   Owner: ${accountInfo.owner.toBase58()}`);
      console.log(`   Data Length: ${accountInfo.data.length}`);
      console.log(`   Discriminator: ${discriminatorHex}`);
      console.log(`   Discriminator Array: [${Array.from(discriminator).join(', ')}]`);
      console.log("");
      
    } catch (error: any) {
      console.error(`❌ ${name}: ${pubkey.toBase58()}`);
      console.error(`   Error: ${error.message}`);
      console.log("");
    }
  }
  
  console.log("\n🔍 Analysis:");
  console.log("   - Check if all accounts exist");
  console.log("   - Verify owners match expected programs");
  console.log("   - Compare discriminators with IDL expectations");
}

main().catch(console.error);
