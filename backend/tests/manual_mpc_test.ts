import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { SavingsMxe } from "../target/types/savings_mxe";
import { randomBytes } from "crypto";
import {
  awaitComputationFinalization,
  getCompDefAccOffset,
  getArciumAccountBaseSeed,
  getArciumProgAddress,
  x25519,
  RescueCipher,
  deserializeLE,
} from "@arcium-hq/client";
import * as fs from "fs";
import * as os from "os";

// Simple manual MPC test script
// Queues one encrypted computation and waits for finalization

async function main() {
  // Connect to devnet
  const connection = new anchor.web3.Connection(
    "https://api.devnet.solana.com",
    "confirmed"
  );

  const provider = new anchor.AnchorProvider(connection, anchor.Wallet.local(), {
    commitment: "confirmed",
  });

  anchor.setProvider(provider);

  const program = anchor.workspace.SavingsMxe as Program<SavingsMxe>;

  // Use MXE authority wallet
  const walletPath = process.env.ANCHOR_WALLET || `${os.homedir()}/.config/solana/devnet-keypair.json`;
  const owner = anchor.web3.Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(walletPath, 'utf8')))
  );

  console.log("🌐 Connected to devnet");
  console.log("📝 Program ID:", program.programId.toString());
  console.log("👤 Owner:", owner.publicKey.toString());

  // Get MXE public key
  console.log("\n🔑 Getting MXE public key...");
  const mxePublicKey = await getMXEPublicKeyWithRetry(provider, program.programId);
  console.log("✅ MXE Public Key:", mxePublicKey.toString());

  // Generate encryption keys
  console.log("\n🔐 Setting up encryption...");
  const privateKey = x25519.utils.randomSecretKey();
  const publicKey = x25519.getPublicKey(privateKey);

  // Derive shared secret
  const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey);
  const cipher = new RescueCipher(sharedSecret);

  // Encrypt values: 7 + 5 = 12
  const v1 = BigInt(7);
  const v2 = BigInt(5);
  const nonce = randomBytes(16);

  const ciphertext = cipher.encrypt([v1, v2], nonce);
  console.log("✅ Encrypted values:", ciphertext.map(b => b.toString()));

  // Queue computation
  console.log("\n📤 Queueing computation...");
  const computationOffset = new BN(0);

  const queueSig = await program.methods
    .addTwoContributions(
      computationOffset,
      Array.from(ciphertext[0]),
      Array.from(ciphertext[1]),
      Array.from(publicKey),
      new BN(deserializeLE(nonce).toString())
    )
    .accountsPartial({
      computationAccount: getComputationAccAddress(program.programId, computationOffset),
      clusterAccount: new PublicKey("GgSqqAyH7AVY3Umcv8NvncrjFaNJuQLmxzxFxPoPW2Yd"),
      mxeAccount: getMXEAccAddress(program.programId),
      mempoolAccount: getMempoolAccAddress(program.programId),
      executingPool: getExecutingPoolAccAddress(program.programId),
      payer: owner.publicKey,
      signPdaAccount: getSignPdaAddress(program.programId),
    })
    .signers([owner])
    .rpc({ commitment: "confirmed" });

  console.log("✅ Computation queued:", queueSig);

  // Wait for finalization
  console.log("\n⏳ Waiting for MPC finalization...");
  console.log("(This may take 1-3 minutes on devnet...)");

  const finalizationResult = await awaitComputationFinalization(
    provider,
    program.programId,
    new BN(0), // computationOffset is 0
    300000 // 5 minute timeout
  );

  console.log("🎉 Computation finalized!");
  console.log("📊 Result:", finalizationResult);

  // The callback should have emitted an event
  console.log("\n✅ SUCCESS: Your MPC works on devnet!");
}

// Helper functions
function getMXEAccAddress(programId: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("mxe")],
    programId
  )[0];
}

function getMempoolAccAddress(programId: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("mempool")],
    programId
  )[0];
}

function getExecutingPoolAccAddress(programId: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("executing_pool")],
    programId
  )[0];
}

function getComputationAccAddress(programId: PublicKey, offset: BN): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("computation"), Buffer.from(offset.toArray("le", 8))],
    programId
  )[0];
}

function getSignPdaAddress(programId: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("sign_pda")],
    programId
  )[0];
}

async function getMXEPublicKeyWithRetry(
  provider: anchor.AnchorProvider,
  programId: PublicKey,
  maxRetries = 10
): Promise<Uint8Array> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const mxeAccount = await provider.connection.getAccountInfo(
        PublicKey.findProgramAddressSync([Buffer.from("mxe")], programId)[0]
      );
      if (!mxeAccount) throw new Error("MXE account not found");

      // Extract public key from MXE account data
      return new Uint8Array(mxeAccount.data.slice(8, 40));
    } catch (error) {
      console.log(`Attempt ${attempt} failed:`, error.message);
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        throw new Error(`Failed to fetch MXE public key after ${maxRetries} attempts`);
      }
    }
  }
}

main().catch(console.error);
