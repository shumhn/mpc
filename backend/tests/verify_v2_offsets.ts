import { getCompDefAccOffset } from "@arcium-hq/client";

console.log("🔍 V2 Circuit Offsets:\n");

const circuits = [
  "add_two_contributions_v2",
  "check_goal_reached_v2", 
  "reveal_contributions_5_v2",
  "reveal_contributions_10_v2"
];

circuits.forEach(name => {
  const offsetBytes = getCompDefAccOffset(name as any);
  const offset = Buffer.from(offsetBytes).readUInt32LE(0);
  console.log(`${name}:`);
  console.log(`  Offset: ${offset}`);
  console.log(`  Hex: 0x${offset.toString(16)}`);
  console.log("");
});
