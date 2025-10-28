import { x25519 } from "@arcium-hq/client";
import * as fs from "fs";

// Generate a test x25519 keypair for localnet MXE
const privateKey = x25519.utils.randomSecretKey();
const publicKey = x25519.getPublicKey(privateKey);

console.log("Generated test x25519 keypair for localnet MXE:");
console.log("Public Key (hex):", Buffer.from(publicKey).toString('hex'));
console.log("Public Key (array):", Array.from(publicKey));

// Save the private key for reference (in real deployment, this would be managed by MPC)
fs.writeFileSync(
  'artifacts/test_mxe_private_key.json',
  JSON.stringify({
    privateKey: Array.from(privateKey),
    publicKey: Array.from(publicKey),
    note: "Test keypair for localnet only - DO NOT use in production"
  }, null, 2)
);

console.log("\n✅ Test keypair saved to artifacts/test_mxe_private_key.json");
console.log("\nTo use this in your MXE artifact:");
console.log("1. Update artifacts/mxe_acc.json");
console.log("2. Set the x25519Pubkey.set field to the public key array");
console.log("3. Restart the validator with the updated artifact");
