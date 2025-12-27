import {
  benchmark,
  decode,
  encode,
  fromHumanReadable,
  toHumanReadable,
} from "@/lib/pjson";

export async function GET() {
  // Demo data
  const demoData = {
    message: "Hello from PJSON!",
    timestamp: Date.now(),
    users: [
      { id: 1, name: "Alice", active: true },
      { id: 2, name: "Bob", active: false },
      { id: 3, name: "Charlie", active: true },
    ],
    metadata: {
      version: "1.0.0",
      encoding: "pjson",
      active: true, // Reuses "active" key via reference
    },
  };

  const pjsonEncoded = encode(demoData);
  const humanReadable = toHumanReadable(pjsonEncoded);
  const benchmarkResult = benchmark(demoData);

  return Response.json({
    original: demoData,
    pjson: pjsonEncoded,
    humanReadable,
    benchmark: benchmarkResult,
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { action, data, pjson, readable } = body;

  switch (action) {
    case "encode": {
      const encoded = encode(data);
      return Response.json({
        pjson: encoded,
        humanReadable: toHumanReadable(encoded),
        size: {
          json: JSON.stringify(data).length,
          pjson: encoded.length,
        },
      });
    }

    case "decode": {
      const decoded = decode(pjson);
      return Response.json({
        data: decoded,
        humanReadable: toHumanReadable(pjson),
      });
    }

    case "toHuman": {
      return Response.json({
        humanReadable: toHumanReadable(pjson),
      });
    }

    case "fromHuman": {
      const pjsonResult = fromHumanReadable(readable);
      const decoded = decode(pjsonResult);
      return Response.json({
        pjson: pjsonResult,
        data: decoded,
      });
    }

    case "benchmark": {
      return Response.json(benchmark(data));
    }

    default:
      return Response.json(
        {
          error:
            "Unknown action. Use: encode, decode, toHuman, fromHuman, benchmark",
        },
        { status: 400 },
      );
  }
}
