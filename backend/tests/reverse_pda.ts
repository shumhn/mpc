import * as anchor from "@coral-xyz/anchor";
import { getArciumAccountBaseSeed } from "@arcium-hq/client";
import * as crypto from "crypto";

const programId = new anchor.web3.PublicKey("4rWRT9mgwWdz9GDpsYeZPZ6arBPCsjG2rquAbLpxGa4i");
const arciumProgramId = new anchor.web3.PublicKey("BKck65TgoKRokMjQM3datB9oRwJ8rAj2jxPXvHXUvcL6");
const mxeAccount = new anchor.web3.PublicKey("G8xQgM6XgiU18brB7QnuL2R1WpXF8VnnCEjbr1Dtyo76"); // From memory
const expectedPDA = new anchor.web3.PublicKey("7usj6cS5NrJkoeAKG1wzG8YrxUFdsS9FR2inVxG2XSL7");

console.log("🔍 Reverse Engineering PDA Seeds\n");
console.log("Target PDA:", expectedPDA.toBase58());
console.log("Program ID:", programId.toBase58());
console.log("Arcium Program:", arciumProgramId.toBase58());
console.log("MXE Account:", mxeAccount.toBase58());
console.log();

const circuitName = "add_two_contributions";
const hash = crypto.createHash("sha256").update(circuitName).digest();
const offset = hash.readUInt32LE(0);

console.log("Circuit:", circuitName);
console.log("Offset:", offset);
console.log();

// Try different seed combinations
const baseSeed = getArciumAccountBaseSeed("ComputationDefinitionAccount");
const offsetBuffer = Buffer.alloc(4);
offsetBuffer.writeUInt32LE(offset, 0);

console.log("Testing different seed combinations:\n");

// Test 1: Original (baseSeed, programId, offset)
try {
  const [pda1, bump1] = anchor.web3.PublicKey.findProgramAddressSync(
    [baseSeed, programId.toBuffer(), offsetBuffer],
    arciumProgramId
  );
  console.log("1. [baseSeed, programId, offset]:", pda1.toBase58(), bump1 === 255 ? "✅" : `(bump: ${bump1})`);
  if (pda1.toBase58() === expectedPDA.toBase58()) console.log("   ⭐ MATCH!");
} catch (e) {
  console.log("1. [baseSeed, programId, offset]: ERROR");
}

// Test 2: Using MXE account instead of program ID
try {
  const [pda2, bump2] = anchor.web3.PublicKey.findProgramAddressSync(
    [baseSeed, mxeAccount.toBuffer(), offsetBuffer],
    arciumProgramId
  );
  console.log("2. [baseSeed, mxeAccount, offset]:", pda2.toBase58(), bump2 === 255 ? "✅" : `(bump: ${bump2})`);
  if (pda2.toBase58() === expectedPDA.toBase58()) console.log("   ⭐ MATCH!");
} catch (e) {
  console.log("2. [baseSeed, mxeAccount, offset]: ERROR");
}

// Test 3: Using offset as bytes (not buffer)
try {
  const [pda3, bump3] = anchor.web3.PublicKey.findProgramAddressSync(
    [baseSeed, programId.toBuffer(), hash.slice(0, 4)],
    arciumProgramId
  );
  console.log("3. [baseSeed, programId, hash[0:4]]:", pda3.toBase58(), bump3 === 255 ? "✅" : `(bump: ${bump3})`);
  if (pda3.toBase58() === expectedPDA.toBase58()) console.log("   ⭐ MATCH!");
} catch (e) {
  console.log("3. [baseSeed, programId, hash[0:4]]: ERROR");
}

// Test 4: Circuit name as seed directly
try {
  const [pda4, bump4] = anchor.web3.PublicKey.findProgramAddressSync(
    [baseSeed, programId.toBuffer(), Buffer.from(circuitName)],
    arciumProgramId
  );
  console.log("4. [baseSeed, programId, circuitName]:", pda4.toBase58(), bump4 === 255 ? "✅" : `(bump: ${bump4})`);
  if (pda4.toBase58() === expectedPDA.toBase58()) console.log("   ⭐ MATCH!");
} catch (e) {
  console.log("4. [baseSeed, programId, circuitName]: ERROR");
}

// Test 5: Using MXE account + circuit name
try {
  const [pda5, bump5] = anchor.web3.PublicKey.findProgramAddressSync(
    [baseSeed, mxeAccount.toBuffer(), Buffer.from(circuitName)],
    arciumProgramId
  );
  console.log("5. [baseSeed, mxeAccount, circuitName]:", pda5.toBase58(), bump5 === 255 ? "✅" : `(bump: ${bump5})`);
  if (pda5.toBase58() === expectedPDA.toBase58()) console.log("   ⭐ MATCH!");
} catch (e) {
  console.log("5. [baseSeed, mxeAccount, circuitName]: ERROR");
}

// Test 6: Different base seed
try {
  const [pda6, bump6] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("computation_definition"), programId.toBuffer(), offsetBuffer],
    arciumProgramId
  );
  console.log("6. [\"computation_definition\", programId, offset]:", pda6.toBase58(), bump6 === 255 ? "✅" : `(bump: ${bump6})`);
  if (pda6.toBase58() === expectedPDA.toBase58()) console.log("   ⭐ MATCH!");
} catch (e) {
  console.log("6. [\"computation_definition\", programId, offset]: ERROR");
}

// Test 7: MXE + offset
try {
  const [pda7, bump7] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("computation_definition"), mxeAccount.toBuffer(), offsetBuffer],
    arciumProgramId
  );
  console.log("7. [\"computation_definition\", mxeAccount, offset]:", pda7.toBase58(), bump7 === 255 ? "✅" : `(bump: ${bump7})`);
  if (pda7.toBase58() === expectedPDA.toBase58()) console.log("   ⭐ MATCH!");
} catch (e) {
  console.log("7. [\"computation_definition\", mxeAccount, offset]: ERROR");
}

// Test 8: Just baseSeed + offset (no program ID)
try {
  const [pda8, bump8] = anchor.web3.PublicKey.findProgramAddressSync(
    [baseSeed, offsetBuffer],
    arciumProgramId
  );
  console.log("8. [baseSeed, offset]:", pda8.toBase58(), bump8 === 255 ? "✅" : `(bump: ${bump8})`);
  if (pda8.toBase58() === expectedPDA.toBase58()) console.log("   ⭐ MATCH!");
} catch (e) {
  console.log("8. [baseSeed, offset]: ERROR");
}
