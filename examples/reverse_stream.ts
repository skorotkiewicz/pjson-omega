import { encode } from "../lib/pj";

/**
 * REVERSE STREAMING DEMO (CLIENT -> SERVER)
 * This script demonstrates the "Hydration Resilience" of PJSON by
 * streaming a large PJSON payload to a server.
 * The server decodes the partial stream in real-time.
 */

const PAYLOAD_SIZE = 50;

const server = Bun.serve({
  port: 8888,
  async fetch(req) {
    if (req.method === "POST") {
      const reader = req.body?.getReader();
      if (!reader) return new Response("No body", { status: 400 });

      console.log("\n[SERVER] <<< Incoming PJSON Stream Started");

      let buffer = "";
      const decoder = new TextDecoder();
      const { decode } = await import("../lib/pj");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // Try to decode the partial buffer
        // This demonstrates the core feature of PJSON: Hydration of partial data.
        const partialData = decode(buffer) as any;

        const count = partialData?.items?.length || 0;
        console.log(
          `[SERVER] Received ${chunk.length} bytes. Total Buffer: ${buffer.length} bytes. Items Hydrated: ${count}`,
        );
      }

      console.log("[SERVER] Stream Complete. Finalizing...");
      return new Response("OK");
    }
    return new Response("Use POST to stream PJSON", { status: 405 });
  },
});

console.log(`[REVERSE DEMO] Server listening on http://localhost:3002`);

// --- CLIENT SIMULATOR ---
async function startClientStream() {
  const data = {
    title: "Large Stream Packet",
    items: Array.from({ length: PAYLOAD_SIZE }, (_, i) => ({
      id: i,
      name: `Entity_${i}`,
      status: "SYNCING",
      timestamp: Date.now(),
    })),
  };

  const encoded = encode(data);
  console.log(`[CLIENT] Total Encoded Size: ${encoded.length} bytes`);

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const chunks = 10;
      const chunkSize = Math.ceil(encoded.length / chunks);

      for (let i = 0; i < encoded.length; i += chunkSize) {
        const chunk = encoded.slice(i, i + chunkSize);
        controller.enqueue(encoder.encode(chunk));
        console.log(`[CLIENT] >>> Sending Chunk (${chunk.length} bytes)...`);
        await new Promise((r) => setTimeout(r, 600)); // Simulate slow uplink
      }
      controller.close();
    },
  });

  await fetch("http://localhost:3002", {
    method: "POST",
    body: stream,
  });
  console.log("[CLIENT] Transmission Complete.");
}

setTimeout(startClientStream, 1000);
