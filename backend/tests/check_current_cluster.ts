import { getClusterAccAddress } from "@arcium-hq/client";

// Current test configuration
const clusterFromOffset = getClusterAccAddress(1078779259);

// Also show the hardcoded working cluster
const hardcodedCluster = "GgSqqAyH7AVY3Umcv8NvncrjFaNJuQLmxzxFxPoPW2Yd";

console.log("🔍 Current Cluster Configuration:");
console.log("================================");
console.log("Cluster from offset 1078779259:", clusterFromOffset.toBase58());
console.log("Hardcoded working cluster:", hardcodedCluster);
console.log("");
console.log("Which one is the test currently using?");
