import { encode } from "@/lib/pj";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = {
    status: "streaming",
    timestamp: Date.now(),
    sequence: Array.from({ length: 50 }, (_, i) => ({
      id: i + 1,
      value: Math.random().toString(36).slice(2, 7),
      active: i % 2 === 0,
      tags: ["stream", "live", "pjson"],
      meta: {
        latency: Math.floor(Math.random() * 100),
        processed: true,
      },
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
