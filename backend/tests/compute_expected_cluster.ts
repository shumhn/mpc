import { PublicKey } from "@solana/web3.js";
import { getArciumProgAddress } from "@arcium-hq/client";

// Your MXE account
const mxeAccount = new PublicKey("G8xQgM6XgiU18brB7QnuL2R1WpXF8VnnCEjbr1Dtyo76");

// Derive cluster PDA exactly as derive_cluster_pda!(mxe_account) does
// Based on Arcium's derive_cluster_pda macro, it uses: ["cluster", mxe_account.as_ref()]
const [clusterPDA, bump] = PublicKey.findProgramAddressSync(
  [Buffer.from("cluster"), mxeAccount.toBuffer()],
  getArciumProgAddress()
);

console.log("\n🔍 Expected Cluster Account Analysis:");
console.log("=====================================");
console.log("MXE Account:", mxeAccount.toBase58());
console.log("Expected Cluster PDA:", clusterPDA.toBase58());
console.log("Bump:", bump);
console.log("\nThis is the EXACT cluster your Rust program expects!");
console.log("Any other cluster will fail the address constraint.");
