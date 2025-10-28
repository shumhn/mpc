import * as anchor from "@coral-xyz/anchor";
import { getCompDefAccAddress, getCompDefAccOffset, getArciumAccountBaseSeed, getArciumProgAddress } from "@arcium-hq/client";
import * as crypto from "crypto";

const programId = new anchor.web3.PublicKey("4rWRT9mgwWdz9GDpsYeZPZ6arBPCsjG2rquAbLpxGa4i");
const arciumProgramId = new anchor.web3.PublicKey("BKck65TgoKRokMjQM3datB9oRwJ8rAj2jxPXvHXUvcL6");

console.log("🔍 Debugging PDA Derivation\n");

// Method 1: Using Arcium client
console.log("Method 1: Arcium Client Functions");
const circuitName = "add_two_contributions";
const offsetBytes = getCompDefAccOffset(circuitName as any);
const offset = Buffer.from(offsetBytes).readUInt32LE(0);
const clientPDA = getCompDefAccAddress(programId, offset);
console.log("Circuit name:", circuitName);
console.log("Offset:", offset);
console.log("Client PDA:", clientPDA.toBase58());
console.log();

// Method 2: Manual derivation using documented seeds
console.log("Method 2: Manual Derivation (b\"ComputationDefinitionAccount\", mxe_program_id, offset)");
const baseSeed = getArciumAccountBaseSeed("ComputationDefinitionAccount");
console.log("Base seed:", Buffer.from(baseSeed).toString("hex"));

// Convert offset to 4-byte little-endian buffer
const offsetBuffer = Buffer.alloc(4);
offsetBuffer.writeUInt32LE(offset, 0);
console.log("Offset buffer:", offsetBuffer.toString("hex"));

const manualPDA = anchor.web3.PublicKey.findProgramAddressSync(
  [baseSeed, programId.toBuffer(), offsetBuffer],
  arciumProgramId
)[0];
console.log("Manual PDA:", manualPDA.toBase58());
console.log();

// Method 3: Calculate offset ourselves
console.log("Method 3: Calculate offset from scratch");
const hash = crypto.createHash("sha256").update(circuitName).digest();
const calculatedOffset = hash.readUInt32LE(0);
console.log("SHA256 hash:", hash.toString("hex"));
console.log("Calculated offset:", calculatedOffset);

const calculatedOffsetBuffer = Buffer.alloc(4);
calculatedOffsetBuffer.writeUInt32LE(calculatedOffset, 0);

const calculatedPDA = anchor.web3.PublicKey.findProgramAddressSync(
  [baseSeed, programId.toBuffer(), calculatedOffsetBuffer],
  arciumProgramId
)[0];
console.log("Calculated PDA:", calculatedPDA.toBase58());
console.log();

// Compare
console.log("Comparison:");
console.log("Client PDA matches Manual PDA:", clientPDA.toBase58() === manualPDA.toBase58());
console.log("Client PDA matches Calculated PDA:", clientPDA.toBase58() === calculatedPDA.toBase58());
console.log("Manual PDA matches Calculated PDA:", manualPDA.toBase58() === calculatedPDA.toBase58());
console.log();

// What Arcium program expects (from error log)
const expectedPDA = "7usj6cS5NrJkoeAKG1wzG8YrxUFdsS9FR2inVxG2XSL7";
console.log("Expected by Arcium program:", expectedPDA);
console.log("Client PDA matches expected:", clientPDA.toBase58() === expectedPDA);
console.log("Manual PDA matches expected:", manualPDA.toBase58() === expectedPDA);
console.log("Calculated PDA matches expected:", calculatedPDA.toBase58() === expectedPDA);
