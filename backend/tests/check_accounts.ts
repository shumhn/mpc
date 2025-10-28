import { getStakingPoolAccAddress, getClockAccAddress, ARCIUM_ADDR } from "@arcium-hq/client";
import { PublicKey } from "@solana/web3.js";

console.log("Arcium Account Addresses:");
console.log("=========================");
console.log("Arcium Program:", typeof ARCIUM_ADDR === 'string' ? ARCIUM_ADDR : ARCIUM_ADDR.toBase58());
console.log("Staking Pool (Fee Pool):", getStakingPoolAccAddress().toBase58());
console.log("Clock Account:", getClockAccAddress().toBase58());
