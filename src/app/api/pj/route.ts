import { compare, decode, encode } from "@/lib/pj";

// GET: Encode and return data
export async function GET(request: Request) {
  const url = new URL(request.url);
  const raw = url.searchParams.get("d");

  if (raw) {
    // Decode PJ string
    const data = decode(raw);
    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Demo
  return Response.json({ ok: true, msg: "Use POST to encode/decode" });
}

// POST: Main communication endpoint
export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  // If sending PJ data directly (text/plain or application/pj)
  if (
    contentType.includes("text/plain") ||
    contentType.includes("application/pj")
  ) {
    const pjData = await request.text();
    const decoded = decode(pjData);
    return Response.json(decoded);
  }

  // JSON request
  const body = await request.json();

  // Encode to PJ
  if (body.encode !== undefined) {
    const pj = encode(body.encode);
    const stats = compare(body.encode);
    return new Response(pj, {
      headers: {
        "Content-Type": "application/pj",
        "X-PJ-Size": stats.pj.toString(),
        "X-JSON-Size": stats.json.toString(),
        "X-Saved": stats.saved,
      },
    });
  }

  // Decode PJ
  if (body.decode !== undefined) {
    const data = decode(body.decode);
    return Response.json(data);
  }

  // Compare sizes
  if (body.compare !== undefined) {
    return Response.json(compare(body.compare));
  }

  return Response.json(
    { error: 'Send { encode: data } or { decode: "pjstring" }' },
    { status: 400 },
  );
}
