import * as anchor from "@coral-xyz/anchor";
import BN from "bn.js";

async function debugInstruction() {
  console.log("🔍 Debugging Instruction Building...\n");

  try {
    const provider = anchor.AnchorProvider.env();
    const program = anchor.workspace.SavingsMxe as any;

    console.log("✅ Program loaded:", program.programId.toBase58());

    // Check if method exists
    const method = program.methods.addTwoContributions;
    console.log("✅ Method exists:", !!method);

    // Try to call the method and see what happens
    console.log("\n🔄 Attempting method call...");

    try {
      const methodBuilder = method(
        new BN(12345), // computation_offset
        Array.from(Buffer.alloc(32)), // ciphertext_0
        Array.from(Buffer.alloc(32)), // ciphertext_1
        Array.from(Buffer.alloc(32)), // pub_key
        new BN(0) // nonce
      );

      console.log("✅ Method call successful - builder created");

      // Now try to add accounts
      console.log("🔄 Adding accounts...");

      const accounts = {
        payer: provider.wallet.publicKey,
        signPdaAccount: anchor.web3.PublicKey.findProgramAddressSync(
          [Buffer.from("SignerAccount")],
          program.programId
        )[0],
        mxeAccount: new anchor.web3.PublicKey("6YmsnnM7Ky5fremALz4Fdk9eymwb9quzzaCP2pYLBhDX"),
        mempoolAccount: anchor.web3.PublicKey.findProgramAddressSync(
          [Buffer.from("mempool"), program.programId.toBuffer()],
          new anchor.web3.PublicKey("BKck65TgoKRokMjQM3datB9oRwJ8rAj2jxPXvHXUvcL6")
        )[0],
        executingPool: anchor.web3.PublicKey.findProgramAddressSync(
          [Buffer.from("executing_pool"), program.programId.toBuffer()],
          new anchor.web3.PublicKey("BKck65TgoKRokMjQM3datB9oRwJ8rAj2jxPXvHXUvcL6")
        )[0],
        computationAccount: anchor.web3.PublicKey.findProgramAddressSync(
          [Buffer.from("computation"), Buffer.from(new BN(Date.now().toString()).toArray("le", 8))],
          program.programId
        )[0],
        compDefAccount: anchor.web3.PublicKey.findProgramAddressSync(
          [Buffer.from("computation_definition"), program.programId.toBuffer(), Buffer.from("add_two_contributions_v2")],
          new anchor.web3.PublicKey("BKck65TgoKRokMjQM3datB9oRwJ8rAj2jxPXvHXUvcL6")
        )[0],
        clusterAccount: new anchor.web3.PublicKey("CaTxKKfdaoCM7ZzLj5dLzrrmnsg9GJb5iYzRzCk8VEu3"),
        poolAccount: new anchor.web3.PublicKey("7MGSS4iKNM4sVib7bDZDJhVqB6EcchPwVnTKenCY1jt3"),
        clockAccount: new anchor.web3.PublicKey("FHriyvoZotYiFnbUzKFjzRSb2NiaC8RPWY7jtKuKhg65"),
        systemProgram: anchor.web3.SystemProgram.programId,
        arciumProgram: new anchor.web3.PublicKey("BKck65TgoKRokMjQM3datB9oRwJ8rAj2jxPXvHXUvcL6"),
      };

      const withAccounts = methodBuilder.accounts(accounts);
      console.log("✅ Accounts added successfully");

      // Try to get the instruction
      console.log("🔄 Building instruction...");
      const instruction = await withAccounts.instruction();
      console.log("✅ Instruction built successfully!");
      console.log("Data length:", instruction.data.length);
      console.log("Discriminator:", Array.from(instruction.data.slice(0, 8)));

    } catch (innerError: any) {
      console.log("❌ Method call failed:", innerError.message);

      if (innerError.message.includes("Unknown action")) {
        console.log("\n🎯 FOUND THE ISSUE: 'Unknown action' error!");
        console.log("This means the instruction discriminator lookup failed.");
        console.log("\nPossible root causes:");
        console.log("1. IDL doesn't match the deployed program on devnet");
        console.log("2. Program was not redeployed after v2 changes");
        console.log("3. Method name mismatch in IDL vs program");
        console.log("4. Account structure mismatch");
      }
    }

  } catch (error: any) {
    console.log("❌ Debug setup failed:", error.message);
  }
}

debugInstruction().catch(console.error);
