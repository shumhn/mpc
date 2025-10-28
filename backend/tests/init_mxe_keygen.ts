import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { getMXEPublicKey } from "@arcium-hq/client";

async function main() {
  console.log("🔐 Initializing MXE Keygen on Devnet...\n");
  
  // Connect to devnet
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  
  const programId = new PublicKey("4rWRT9mgwWdz9GDpsYeZPZ6arBPCsjG2rquAbLpxGa4i");
  const mxeAccount = new PublicKey("6YmsnnM7Ky5fremALz4Fdk9eymwb9quzzaCP2pYLBhDX");
  
  console.log("📋 Configuration:");
  console.log("   Program ID:", programId.toBase58());
  console.log("   MXE Account:", mxeAccount.toBase58());
  console.log("   RPC:", provider.connection.rpcEndpoint);
  console.log("");
  
  try {
    console.log("⏳ Running keygen computation (this will trigger MPC)...");
    console.log("   This may take 10-30 seconds for MPC nodes to execute...\n");
    
    // Call getMXEPublicKey - it automatically runs keygen if the key is unset
    const publicKey = await getMXEPublicKey(provider, programId);
    
    console.log("✅ SUCCESS! MXE Public Key Initialized!");
    console.log("   Public Key:", Buffer.from(publicKey).toString('hex'));
    console.log("   Length:", publicKey.length);
    
    console.log("\n🎉 MXE is now ready for MPC computations!");
    console.log("\n📝 Next Steps:");
    console.log("   1. The MXE x25519 public key is now set");
    console.log("   2. You can now run MPC computations (add_two_contributions, check_goal_reached, etc.)");
    console.log("   3. Run the E2E test to verify the full MPC flow");
    
  } catch (error: any) {
    console.error("\n❌ Keygen failed!");
    console.error("Error:", error.message || error);
    
    if (error.logs) {
      console.error("\nProgram logs:");
      error.logs.forEach((log: string) => console.error("  ", log));
    }
    
    console.error("\n🔍 Troubleshooting:");
    console.error("   - Ensure the MPC cluster (1078779259) has active nodes on devnet");
    console.error("   - Check that your RPC endpoint is reliable");
    console.error("   - Verify the MXE account exists and is owned by Arcium");
    console.error("   - Contact Arcium support if the cluster is inactive");
    
    process.exit(1);
  }
}

main().catch(console.error);
