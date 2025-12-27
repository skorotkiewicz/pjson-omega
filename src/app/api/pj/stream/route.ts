import { encode } from "@/lib/pj";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = {
    status: "streaming",
    timestamp: Date.now(),
    sequence: Array.from({ length: 50 }, (_, i) => ({
      id: i + 1,
      user: `Node_${(i + 1).toString().padStart(3, "0")}`,
      status: ["ACTIVE", "STANDBY", "RECOVERING"][i % 3],
      load: Math.floor(Math.random() * 100),
      metrics: {
        cpu: (Math.random() * 100).toFixed(1),
        temp: (30 + Math.random() * 40).toFixed(1),
      },
      tags: ["PROD", "NODE", "PJSON"].slice(0, (i % 3) + 1),
    })),
    footer: "Full transmission complete",
  };

  const fullPj = encode(data);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Chunk the PJ string into small pieces to simulate network latency
      // Smaller chunks for a more progressive effect
      const chunkSize = Math.ceil(fullPj.length / 50);
      for (let i = 0; i < fullPj.length; i += chunkSize) {
        const chunk = fullPj.slice(i, i + chunkSize);
        controller.enqueue(encoder.encode(chunk));
        // Increased delay to make the stream slower
        await new Promise((r) => setTimeout(r, 500));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
}
