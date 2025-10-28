import { PublicKey } from "@solana/web3.js";
import { getMXEAccAddress } from "@arcium-hq/client";

const freshProgramId = new PublicKey("4rWRT9mgwWdz9GDpsYeZPZ6arBPCsjG2rquAbLpxGa4i");
const oldProgramId = new PublicKey("EM5iYTHRUEKSSv7vkwHpvd2KjpMGKzBqCYD4h7TwQmJF");

const correctMXE = getMXEAccAddress(freshProgramId);
const oldMXE = getMXEAccAddress(oldProgramId);

console.log("🔍 MXE Account Analysis:");
console.log("========================");
console.log("Fresh Program:", freshProgramId.toBase58());
console.log("Correct MXE for Fresh Program:", correctMXE.toBase58());
console.log("");
console.log("Old Program:", oldProgramId.toBase58());
console.log("Old MXE:", oldMXE.toBase58());
console.log("");
console.log("Test is using:", "G8xQgM6XgiU18brB7QnuL2R1WpXF8VnnCEjbr1Dtyo76");
console.log("Match with old MXE?", oldMXE.toBase58() === "G8xQgM6XgiU18brB7QnuL2R1WpXF8VnnCEjbr1Dtyo76");
console.log("");
console.log("✅ UPDATE TEST TO USE:", correctMXE.toBase58());
