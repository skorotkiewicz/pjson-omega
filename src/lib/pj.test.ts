import { describe, expect, test } from "bun:test";
import { decode, encode } from "./pj";

describe("PJ Protocol", () => {
  describe("primitives", () => {
    test("null", () => {
      expect(decode(encode(null))).toBe(null);
    });

    test("true", () => {
      expect(decode(encode(true))).toBe(true);
    });

    test("false", () => {
      expect(decode(encode(false))).toBe(false);
    });

    test("integer", () => {
      expect(decode(encode(42))).toBe(42);
      expect(decode(encode(0))).toBe(0);
      expect(decode(encode(-123))).toBe(-123);
      expect(decode(encode(999999))).toBe(999999);
    });

    test("float", () => {
      expect(decode(encode(3.14))).toBe(3.14);
      expect(decode(encode(-0.5))).toBe(-0.5);
    });

    test("string", () => {
      expect(decode(encode("hello"))).toBe("hello");
      expect(decode(encode(""))).toBe("");
      expect(decode(encode("a"))).toBe("a");
    });
  });

  describe("arrays", () => {
    test("empty array", () => {
      expect(decode(encode([]))).toEqual([]);
    });

    test("simple array", () => {
      expect(decode(encode([1, 2, 3]))).toEqual([1, 2, 3]);
    });

    test("mixed array", () => {
      expect(decode(encode([1, "two", true, null]))).toEqual([
        1,
        "two",
        true,
        null,
      ]);
    });

    test("nested array", () => {
      expect(
        decode(
          encode([
            [1, 2],
            [3, 4],
          ]),
        ),
      ).toEqual([
        [1, 2],
        [3, 4],
      ]);
    });
  });

  describe("objects", () => {
    test("empty object", () => {
      expect(decode(encode({}))).toEqual({});
    });

    test("simple object", () => {
      expect(decode(encode({ a: 1, b: 2 }))).toEqual({ a: 1, b: 2 });
    });

    test("nested object", () => {
      const obj = { user: { name: "Alice", age: 30 } };
      expect(decode(encode(obj))).toEqual(obj);
    });

    test("object with array", () => {
      const obj = { items: [1, 2, 3], count: 3 };
      expect(decode(encode(obj))).toEqual(obj);
    });
  });

  describe("dictionary compression", () => {
    test("reuses repeated strings", () => {
      const obj = {
        name: "Alice",
        friend: "Alice",
        enemy: "Alice",
      };
      const encoded = encode(obj);
      const decoded = decode(encoded);
      expect(decoded).toEqual(obj);
      // Should use reference for repeated 'Alice'
      expect(encoded.split("Alice").length).toBe(2); // Only appears once
    });

    test("reuses repeated keys", () => {
      const arr = [
        { id: 1, name: "A" },
        { id: 2, name: "B" },
        { id: 3, name: "C" },
      ];
      const encoded = encode(arr);
      const decoded = decode(encoded);
      expect(decoded).toEqual(arr);
    });
  });

  describe("size comparison", () => {
    test("smaller than JSON", () => {
      const data = {
        message: "Hello World",
        users: [
          { id: 1, name: "Alice", active: true },
          { id: 2, name: "Bob", active: false },
        ],
      };
      const json = JSON.stringify(data);
      const pj = encode(data);

      console.log(`JSON: ${json.length} bytes`);
      console.log(`PJ:   ${pj.length} bytes`);
      console.log(`Saved: ${Math.round((1 - pj.length / json.length) * 100)}%`);

      expect(pj.length).toBeLessThan(json.length);
    });
  });

  describe("complex data", () => {
    test("real-world example", () => {
      const data = {
        type: "response",
        status: 200,
        data: {
          users: [
            {
              id: 1,
              username: "alice",
              email: "alice@example.com",
              active: true,
            },
            { id: 2, username: "bob", email: "bob@example.com", active: true },
            {
              id: 3,
              username: "charlie",
              email: "charlie@example.com",
              active: false,
            },
          ],
          pagination: {
            page: 1,
            limit: 10,
            total: 3,
          },
        },
        timestamp: 1703710350000,
      };

      expect(decode(encode(data))).toEqual(data);
    });
  });
});
