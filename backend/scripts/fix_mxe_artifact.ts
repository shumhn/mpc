import { PublicKey } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import { getMXEAccAddress } from "@arcium-hq/client";

/**
 * Fix MXE artifact to use correct address for current program ID
 * This must be run after any program ID change
 */

const PROGRAM_ID = new PublicKey("4rWRT9mgwWdz9GDpsYeZPZ6arBPCsjG2rquAbLpxGa4i");
const ARTIFACTS_DIR = path.join(__dirname, "..", "artifacts");

async function fixMXEArtifact() {
  console.log("🔧 Fixing MXE Artifact for Program ID:", PROGRAM_ID.toBase58());
  console.log("");

  // Calculate correct MXE PDA from program ID
  const correctMXEAddress = getMXEAccAddress(PROGRAM_ID);
  console.log("✅ Correct MXE Address:", correctMXEAddress.toBase58());

  // Read current artifact
  const artifactPath = path.join(ARTIFACTS_DIR, "mxe_acc.json");
  
  let currentArtifact: any;
  try {
    currentArtifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    console.log("📋 Current artifact address:", currentArtifact.pubkey);
  } catch (e) {
    console.log("❌ Could not read current artifact, will create new one");
    currentArtifact = null;
  }

  // Check if already correct
  if (currentArtifact && currentArtifact.pubkey === correctMXEAddress.toBase58()) {
    console.log("✅ MXE artifact already has correct address!");
    return;
  }

  console.log("");
  console.log("🔄 Updating MXE artifact address...");

  // Create new artifact with correct address
  // Preserve account data if it exists, otherwise use template
  const newArtifact = {
    pubkey: correctMXEAddress.toBase58(),
    account: currentArtifact?.account || {
      lamports: 1000000000000,
      data: [
        // Base64 encoded MXE account data with test keypair from test_mxe_private_key.json
        "ZxpV+rOfEXUBFPiB5rjzOPi5rbW+Yrq1UOwI5EFKv2sWanJ11X6N7H0BAAAAayyrJXEJjPZlqzpwpZVcUi0hSDZtHyPKANoTc/3hgB0AAAIAAAAAAAAAAAAAAAAAAQAAAAEAAAD/",
        "base64"
      ],
      owner: "BKck65TgoKRokMjQM3datB9oRwJ8rAj2jxPXvHXUvcL6",
      executable: false,
      rentEpoch: 0,
      space: 2000
    }
  };

  // Write updated artifact
  fs.writeFileSync(artifactPath, JSON.stringify(newArtifact, null, 2));
  console.log("✅ MXE artifact updated!");
  console.log("📁 File:", artifactPath);
  console.log("");
  console.log("⚠️  IMPORTANT: Restart the validator to load the updated artifact!");
  console.log("   Run: arcium test");
}

fixMXEArtifact().catch(console.error);
