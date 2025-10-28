import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SavingsMxe } from "../target/types/savings_mxe";
import { getMXEAccAddress } from "@arcium-hq/client";

async function initMXELocalnet() {
  console.log("🚀 Initializing MXE on localnet...\n");

  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider() as anchor.AnchorProvider;
  const program = anchor.workspace.SavingsMxe as Program<SavingsMxe>;

  console.log("📝 Program ID:", program.programId.toBase58());
  console.log("👤 Payer:", provider.wallet.publicKey.toBase58());

  const mxePda = getMXEAccAddress(program.programId);
  console.log("🔑 MXE PDA:", mxePda.toBase58());

  // Check if MXE already exists
  const existingMXE = await provider.connection.getAccountInfo(mxePda);
  if (existingMXE) {
    console.log("\n✅ MXE account already exists!");
    console.log("   Owner:", existingMXE.owner.toBase58());
    console.log("   Data length:", existingMXE.data.length);
    return;
  }

  console.log("\n📋 MXE account does not exist, initializing...");

  // For localnet, we need to use arcium deploy which handles MXE initialization
  console.log("\n⚠️  Please run: arcium deploy --skip-deploy");
  console.log("   This will initialize the MXE account on localnet");
}

initMXELocalnet().catch(console.error);
