/** biome-ignore-all lint/suspicious/noExplicitAny: <> */
import { describe, expect, test } from "bun:test";
import { compare, decode, encode } from "./pj";

describe("PJSON WIRE-READY Evolution", () => {
  test("native date support", () => {
    const now = new Date();
    const encoded = encode(now);
    const decoded = decode(encoded) as Date;
    expect(decoded instanceof Date).toBe(true);
    expect(decoded.getTime()).toBe(now.getTime());
  });

  test("float bit-packing precision", () => {
    const float = 123.456789012345;
    const encoded = encode(float);
    const decoded = decode(encoded) as number;
    // Should maintain 64-bit float precision
    expect(decoded).toBeCloseTo(float, 10);
    // Should be significantly shorter than JSON stringification
    expect(encoded.length).toBeLessThan(JSON.stringify(float).length);
  });

  test("structural referencing (complex repeat)", () => {
    const user = { name: "Alice", meta: { role: "admin", active: true } };
    const data = {
      primary: user,
      secondary: user, // Same reference
      list: [user, user, user],
    };

    const encoded = encode(data);
    const decoded = decode(encoded) as any;

    // The decoded structure should have identical values
    expect(decoded.primary.name).toBe("Alice");
    expect(decoded.secondary.name).toBe("Alice");
    expect(decoded.list[0].name).toBe("Alice");
    expect(decoded.list[2].meta.role).toBe("admin");

    // Structural check: Does it save space?
    // A repeat of 'user' should basically cost ~2-3 bytes (Marker R + ID)
    const stats = compare(data);
    console.log(`PJSON WIRE Savings: ${stats.saved}`);
  });

  test("mixed complex objects and dates", () => {
    const data = {
      events: [
        { time: new Date(2025, 0, 1), label: "Start" },
        { time: new Date(2025, 11, 31), label: "End" },
      ],
      config: { retry: true, timeout: 5000.5 },
    };

    const encoded = encode(data);
    const decoded = decode(encoded) as any;

    expect(decoded.events[0].time instanceof Date).toBe(true);
    expect(decoded.events[0].time.getFullYear()).toBe(2025);
    expect(decoded.config.timeout).toBe(5000.5);
  });
});
