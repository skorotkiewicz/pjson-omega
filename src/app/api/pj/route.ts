import { decode, encode } from "@/lib/pj";

export async function POST(req: Request) {
  const ct = req.headers.get("content-type") ?? "";

  // PJ in → JSON out
  if (ct.includes("text/plain") || ct.includes("pj")) {
    return Response.json(decode(await req.text()));
  }

  // JSON in → PJ out
  const data = await req.json();
  return new Response(encode(data), {
    headers: { "Content-Type": "text/plain" },
  });
}
