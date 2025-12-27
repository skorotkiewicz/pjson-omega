import { decode, encode } from "../lib/pj";

/**
 * LIVE JSON REHYDRATION DEMO
 * This script demonstrates PJSON's ability to rehydrate a partial bit-stream
 * into a valid, growing JSON object in real-time.
 */

const data = {
  header: "PJSON OMEGA STREAM",
  session_id: "WIRE-99",
  sequence: Array.from({ length: 15 }, (_, i) => ({
    id: i + 1,
    task: `Process_Matrix_${i}`,
    status: "HYDRATING",
    load: Math.floor(Math.random() * 100),
  })),
  footer: "End of Stream",
};

const fullPj = encode(data);
console.log(`[STREAM] Total Size: ${fullPj.length} bytes`);
console.log("[STREAM] Starting Progressive Hydration...\n");

let buffer = "";
const chunkSize = 20; // Small chunks to see it grow

for (let i = 0; i < fullPj.length; i += chunkSize) {
  const chunk = fullPj.slice(i, i + chunkSize);
  buffer += chunk;

  // Decodes the partial buffer into a live JS Object
  const liveObject = decode(buffer) as unknown;

  // Clear console and print growth
  process.stdout.write("\x1Bc"); // Clear screen
  console.log("=== PJSON LIVE REHYDRATION PREVIEW ===");
  console.log(`Bytes Received: ${buffer.length} / ${fullPj.length}`);
  console.log("-----------------------------------------");
  console.log(JSON.stringify(liveObject, null, 2));

  // Artificial delay to witness the "Living Data"
  await new Promise((r) => setTimeout(r, 150));
}

console.log("\n[SUCCESS] Stream Fully Rehydrated.");
