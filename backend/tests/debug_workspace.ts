import * as anchor from "@coral-xyz/anchor";
import { readFileSync } from "fs";
import { join } from "path";

async function debugWorkspace() {
  console.log("🔍 Debugging Anchor Workspace Loading...\n");

  try {
    // Check if provider loads
    const provider = anchor.AnchorProvider.env();
    console.log("✅ Provider loaded successfully");

    // Check if workspace exists
    console.log("Workspace keys:", Object.keys(anchor.workspace));
    console.log("SavingsMxe in workspace:", !!anchor.workspace.SavingsMxe);

    if (anchor.workspace.SavingsMxe) {
      console.log("✅ SavingsMxe program found in workspace");
      const program = anchor.workspace.SavingsMxe;
      console.log("Program ID:", program.programId.toBase58());
      console.log("IDL methods:", Object.keys(program.methods));
    } else {
      console.log("❌ SavingsMxe NOT found in workspace");

      // Try manual IDL loading
      console.log("\n🔄 Trying manual IDL loading...");
      const idlPath = join(__dirname, "../target/idl/savings_mxe.json");
      console.log("IDL Path:", idlPath);

      try {
        const idlContent = readFileSync(idlPath, "utf8");
        console.log("✅ IDL file read successfully");
        console.log("IDL length:", idlContent.length);

        const idl = JSON.parse(idlContent);
        console.log("✅ IDL parsed successfully");
        console.log("IDL name:", idl.name);
        console.log("IDL version:", idl.version);
        console.log("IDL instructions:", idl.instructions?.map(i => i.name) || []);

        const program = new anchor.Program(idl, provider);
        console.log("✅ Manual program creation successful");
        console.log("Program ID:", program.programId.toBase58());
        console.log("Methods:", Object.keys(program.methods));

      } catch (error: any) {
        console.log("❌ Manual IDL loading failed:", error.message);
      }
    }

  } catch (error: any) {
    console.log("❌ Workspace debug failed:", error.message);
  }
}

debugWorkspace().catch(console.error);
