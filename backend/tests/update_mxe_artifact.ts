import * as fs from "fs";
import * as anchor from "@coral-xyz/anchor";

// Read the test keypair we generated
const testKeypair = JSON.parse(fs.readFileSync('artifacts/test_mxe_private_key.json', 'utf8'));
const publicKey = testKeypair.publicKey;

console.log("Updating MXE artifact with test public key...");
console.log("Public Key:", publicKey);

// Read the current MXE artifact
const mxeArtifact = JSON.parse(fs.readFileSync('artifacts/mxe_acc.json', 'utf8'));

// Decode the base64 data
const accountData = Buffer.from(mxeArtifact.account.data[0], 'base64');
console.log("\nOriginal account data length:", accountData.length);
console.log("Original data (hex):", accountData.toString('hex'));

// The MXE account structure (from Arcium):
// - discriminator: 8 bytes
// - authority: 32 bytes
// - cluster: 4 bytes
// - x25519Pubkey enum: 1 byte (variant) + 32 bytes (data) + 32 bytes (padding for unset variant)
// - fallback_clusters: Vec
// - rejected_clusters: Vec
// - computation_definitions: Vec
// - ... other fields

// For the x25519Pubkey enum:
// - If variant = 0 (Set): next 32 bytes are the public key
// - If variant = 1 (Unset): next 32 bytes are zeros, followed by 32 bytes padding

// Find the x25519Pubkey field (after discriminator + authority + cluster = 8 + 32 + 4 = 44 bytes)
const DISCRIMINATOR_SIZE = 8;
const AUTHORITY_SIZE = 32;
const CLUSTER_SIZE = 4;
const X25519_OFFSET = DISCRIMINATOR_SIZE + AUTHORITY_SIZE + CLUSTER_SIZE;

// Create a new buffer with the updated public key
const newAccountData = Buffer.from(accountData);

// Set variant to 0 (Set)
newAccountData[X25519_OFFSET] = 0;

// Copy the public key (32 bytes)
for (let i = 0; i < 32; i++) {
  newAccountData[X25519_OFFSET + 1 + i] = publicKey[i];
}

console.log("\nUpdated account data length:", newAccountData.length);
console.log("Updated x25519Pubkey variant:", newAccountData[X25519_OFFSET]);
console.log("Updated x25519Pubkey data:", Array.from(newAccountData.slice(X25519_OFFSET + 1, X25519_OFFSET + 33)));

// Update the artifact
mxeArtifact.account.data[0] = newAccountData.toString('base64');

// Save the updated artifact
fs.writeFileSync('artifacts/mxe_acc.json', JSON.stringify(mxeArtifact, null, 2));

console.log("\n✅ MXE artifact updated successfully!");
console.log("📝 File: artifacts/mxe_acc.json");
console.log("\n⚠️ Remember to restart the validator to load the updated artifact!");
