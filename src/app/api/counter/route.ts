// Server-side Map to store API call counts
// This Map persists across requests during the server's runtime
const apiCounter = new Map<string, number>();

export async function GET() {
  // Get total count and per-endpoint breakdown
  const total = Array.from(apiCounter.values()).reduce(
    (sum, count) => sum + count,
    0,
  );
  const breakdown = Object.fromEntries(apiCounter.entries());

  // Increment counter for this endpoint
  const currentCount = apiCounter.get("/api/counter") ?? 0;
  apiCounter.set("/api/counter", currentCount + 1);

  return Response.json({
    total,
    breakdown,
    message: "API counter retrieved successfully",
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const endpoint = body.endpoint ?? "unknown";

  // Increment counter for the specified endpoint
  const currentCount = apiCounter.get(endpoint) ?? 0;
  apiCounter.set(endpoint, currentCount + 1);

  return Response.json({
    endpoint,
    count: apiCounter.get(endpoint),
    message: `Counter incremented for ${endpoint}`,
  });
}

export async function DELETE() {
  // Reset all counters
  apiCounter.clear();

  return Response.json({
    message: "All counters have been reset",
    total: 0,
  });
}
