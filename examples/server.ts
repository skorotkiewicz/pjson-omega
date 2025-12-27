import { encode } from "../src/lib/pj";

const server = Bun.serve({
  port: 3001,
  fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/data") {
      const payload = {
        id: 1,
        message: "Hello from PJSON Server",
        timestamp: Date.now(),
        nodes: Array.from({ length: 5 }, (_, i) => ({
          id: i,
          active: true,
          load: Math.random() * 100,
        })),
      };

      // Encode using PJSON for maximum density
      const encoded = encode(payload);

      console.log(
        `[SERVER] Sending ${encoded.length} bytes (JSON would be ${JSON.stringify(payload).length})`,
      );

      return new Response(encoded, {
        headers: { "Content-Type": "text/plain" },
      });
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`[PJSON SERVER] Listening on http://localhost:${server.port}`);
