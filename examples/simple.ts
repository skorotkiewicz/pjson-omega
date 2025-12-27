import { compare, decode, encode } from "../src/lib/pj";

/**
 * PJSON OMEGA - SIMPLE LIBRARY EXAMPLE
 */

const payload = {
  title: "Matrix Transmission",
  version: "1.0.0-OMEGA",
  active: true,
  timestamp: new Date(),
  nodes: [
    { id: 1, type: "GATEWAY", load: 0.45 },
    { id: 2, type: "RELAY", load: 0.12 },
  ],
  metadata: {
    compression: "PJSON_OMEGA",
    industrial: true,
  },
};

// 1. ENCODE
const encoded = encode(payload);
console.log("--- ENCODED PJSON ---");
console.log(encoded);
console.log("");

// 2. DECODE
const decoded = decode(encoded);
console.log("--- DECODED OBJECT ---");
console.log(JSON.stringify(decoded, null, 2));
console.log("");

// 3. COMPARE
const stats = compare(payload);
console.log("--- EFFICIENCY STATS ---");
console.log(`Original JSON: ${stats.json} bytes`);
console.log(`PJSON OMEGA:   ${stats.pj} bytes`);
console.log(`Total Savings: ${stats.saved}`);
console.log("");

// 4. ROUND-TRIP VERIFICATION
const isMatch = JSON.stringify(payload) === JSON.stringify(decoded);
// Note: Deep character comparison for dates since JSON.stringify converts dates to strings
const datesMatch =
  payload.timestamp.getTime() ===
  (decoded as { timestamp: Date }).timestamp.getTime();

if (isMatch && datesMatch) {
  console.log("--- VERIFICATION ---");
  console.log(
    "STATUS: PASS - Decoded version is 100% identical to original. ✅",
  );
} else {
  console.log("--- VERIFICATION ---");
  console.log("STATUS: FAIL - Data mismatch detected. ❌");
}

console.log("\nSYSTEM_STATUS: NOMINAL 🥂🤘🚀");
