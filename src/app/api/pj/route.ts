import { compare, decode, encode } from "@/lib/pj";

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";
    const startTime = performance.now();

    // 1. PJ → JSON (The server acts as a gateway)
    if (contentType.includes("text/plain") || contentType.includes("pj")) {
      const body = await req.text();
      const decoded = decode(body);
      const duration = (performance.now() - startTime).toFixed(2);

      console.log(
        `[PJSON Server] Decoded ${body.length}b → JSON in ${duration}ms`,
      );
      return Response.json(decoded);
    }

    // 2. JSON → PJ (The server optimizes the payload)
    const json = await req.json();
    const encoded = encode(json);
    const stats = compare(json);
    const duration = (performance.now() - startTime).toFixed(2);

    console.log(
      `[PJSON Server] Encoded JSON → ${encoded.length}b in ${duration}ms (Saved ${stats.saved})`,
    );

    return new Response(encoded, {
      headers: {
        "Content-Type": "text/plain",
        "X-PJSON-Stats": JSON.stringify(stats),
        "X-Processed-Time": `${duration}ms`,
      },
    });
  } catch (err) {
    console.error("[PJSON Server Error]", err);
    return new Response("Transmission Corruption Detected", { status: 400 });
  }
}
