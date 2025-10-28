import * as anchor from "@coral-xyz/anchor";

async function checkDiscriminator() {
  console.log("🔍 Checking Instruction Discriminators...\n");

  const provider = anchor.AnchorProvider.env();
  const program = anchor.workspace.SavingsMxe as any;

  console.log("Program ID:", program.programId.toBase58());
  console.log("Available methods:", Object.keys(program.methods));

  // Check if addTwoContributions method exists and get its discriminator
  if (program.methods.addTwoContributions) {
    console.log("\n✅ addTwoContributions method found");

    try {
      // Try to build a minimal instruction to check discriminator
      const method = program.methods.addTwoContributions;
      console.log("Method exists:", !!method);

      // Get the method builder and check its properties
      console.log("Method keys:", Object.keys(method));

    } catch (error: any) {
      console.log("❌ Error accessing method:", error.message);
    }
  } else {
    console.log("\n❌ addTwoContributions method NOT found");
    console.log("Available methods:", Object.keys(program.methods));
  }

  // Check IDL structure
  console.log("\nIDL Info:");
  console.log("IDL name:", program.idl.name);
  console.log("IDL version:", program.idl.version);

  const addTwoInstr = program.idl.instructions?.find(i => i.name === "add_two_contributions");
  if (addTwoInstr) {
    console.log("✅ add_two_contributions instruction found in IDL");
    console.log("Discriminator:", addTwoInstr.discriminator);
  } else {
    console.log("❌ add_two_contributions instruction NOT found in IDL");
    console.log("Available instructions:", program.idl.instructions?.map(i => i.name));
  }
}

checkDiscriminator().catch(console.error);
