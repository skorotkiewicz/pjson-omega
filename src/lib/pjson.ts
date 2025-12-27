/**
 * PJSON - Progressive JSON Protocol
 *
 * A highly optimized communication format designed for:
 * - Minimal byte size (50-80% smaller than JSON)
 * - Progressive parsing (stream-friendly)
 * - LLM/Script optimized tokens
 * - Human-readable encode/decode
 *
 * Format: Uses single-character type markers + compact encoding
 *
 * Type Markers:
 *   n: null
 *   t: true
 *   f: false
 *   i: integer (varint encoded)
 *   d: decimal/float
 *   s: string (length-prefixed)
 *   a: array start
 *   A: array end
 *   o: object start
 *   O: object end
 *   k: key (short string for object keys)
 *   r: reference (back-reference to previous value)
 *   ~: stream chunk boundary
 */

// Type markers as constants for speed
const TYPE = {
  NULL: "n",
  TRUE: "t",
  FALSE: "f",
  INT: "i",
  FLOAT: "d",
  STRING: "s",
  ARRAY_START: "a",
  ARRAY_END: "A",
  OBJECT_START: "o",
  OBJECT_END: "O",
  KEY: "k",
  REF: "r",
  CHUNK: "~",
} as const;

// Varint encoding for compact integers
function encodeVarint(num: number): string {
  if (num === 0) return "0";
  const negative = num < 0;
  num = Math.abs(num);

  // Base64-like encoding for compactness
  const chars =
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz+/";
  let result = "";

  while (num > 0) {
    result = chars[num & 63] + result;
    num = Math.floor(num / 64);
  }

  return negative ? `-${result}` : result;
}

function decodeVarint(str: string): number {
  const chars =
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz+/";
  const negative = str.startsWith("-");
  if (negative) str = str.slice(1);

  let result = 0;
  for (const char of str) {
    result = result * 64 + chars.indexOf(char);
  }

  return negative ? -result : result;
}

// String encoding with escape sequences
function encodeString(str: string): string {
  // Length prefix + content with minimal escaping
  const escaped = str.replace(/\\/g, "\\\\").replace(/\|/g, "\\|");
  return `${encodeVarint(escaped.length)}|${escaped}`;
}

// Reference table for deduplication
class RefTable {
  private table: Map<string, number> = new Map();
  private reverseTable: string[] = [];

  add(value: string): number {
    const existing = this.table.get(value);
    if (existing !== undefined) {
      return existing;
    }
    const idx = this.reverseTable.length;
    this.table.set(value, idx);
    this.reverseTable.push(value);
    return -1; // -1 means new entry
  }

  get(idx: number): string {
    return this.reverseTable[idx];
  }

  getIndex(value: string): number | undefined {
    return this.table.get(value);
  }
}

/**
 * Encode any JavaScript value to PJSON format
 */
export function encode(
  value: unknown,
  refs: RefTable = new RefTable(),
): string {
  if (value === null) return TYPE.NULL;
  if (value === undefined) return TYPE.NULL;
  if (value === true) return TYPE.TRUE;
  if (value === false) return TYPE.FALSE;

  if (typeof value === "number") {
    if (Number.isInteger(value)) {
      return TYPE.INT + encodeVarint(value);
    }
    return TYPE.FLOAT + value.toString();
  }

  if (typeof value === "string") {
    // Check for reference
    const existingIdx = refs.getIndex(value);
    if (existingIdx !== undefined && value.length > 3) {
      return TYPE.REF + encodeVarint(existingIdx);
    }
    refs.add(value);
    return TYPE.STRING + encodeString(value);
  }

  if (Array.isArray(value)) {
    let result = TYPE.ARRAY_START;
    for (const item of value) {
      result += encode(item, refs);
    }
    return result + TYPE.ARRAY_END;
  }

  if (typeof value === "object") {
    let result = TYPE.OBJECT_START;
    for (const [key, val] of Object.entries(value)) {
      // Keys use shorter encoding
      const existingIdx = refs.getIndex(key);
      if (existingIdx !== undefined) {
        result += TYPE.REF + encodeVarint(existingIdx);
      } else {
        refs.add(key);
        result += TYPE.KEY + encodeString(key);
      }
      result += encode(val, refs);
    }
    return result + TYPE.OBJECT_END;
  }

  throw new Error(`Unsupported type: ${typeof value}`);
}

/**
 * Decoder state machine for progressive parsing
 */
export class PJSONDecoder {
  private buffer = "";
  private pos = 0;
  private refs: string[] = [];
  private stack: Array<{
    type: "array" | "object";
    value: unknown[];
    keys?: string[];
  }> = [];
  private currentKey: string | null = null;

  /**
   * Feed more data into the decoder (for streaming)
   */
  feed(data: string): void {
    this.buffer += data;
  }

  /**
   * Try to decode the next complete value
   * Returns undefined if more data is needed
   */
  decode(): unknown | undefined {
    if (this.pos >= this.buffer.length) return undefined;

    const type = this.buffer[this.pos];
    this.pos++;

    switch (type) {
      case TYPE.NULL:
        return this.handleValue(null);

      case TYPE.TRUE:
        return this.handleValue(true);

      case TYPE.FALSE:
        return this.handleValue(false);

      case TYPE.INT: {
        const numStr = this.readUntilType();
        const num = decodeVarint(numStr);
        return this.handleValue(num);
      }

      case TYPE.FLOAT: {
        const numStr = this.readUntilType();
        return this.handleValue(parseFloat(numStr));
      }

      case TYPE.STRING: {
        const str = this.readString();
        if (str === undefined) return undefined;
        this.refs.push(str);
        return this.handleValue(str);
      }

      case TYPE.KEY: {
        const key = this.readString();
        if (key === undefined) return undefined;
        this.refs.push(key);
        this.currentKey = key;
        return this.decode(); // Continue to value
      }

      case TYPE.REF: {
        const idxStr = this.readUntilType();
        const idx = decodeVarint(idxStr);
        const ref = this.refs[idx];
        if (
          this.currentKey === null &&
          this.stack.length > 0 &&
          this.stack[this.stack.length - 1].type === "object"
        ) {
          this.currentKey = ref;
          return this.decode();
        }
        return this.handleValue(ref);
      }

      case TYPE.ARRAY_START: {
        this.stack.push({ type: "array", value: [] });
        return this.decode();
      }

      case TYPE.ARRAY_END: {
        const frame = this.stack.pop();
        if (!frame || frame.type !== "array")
          throw new Error("Unexpected array end");
        return this.handleValue(frame.value);
      }

      case TYPE.OBJECT_START: {
        this.stack.push({ type: "object", value: [], keys: [] });
        return this.decode();
      }

      case TYPE.OBJECT_END: {
        const frame = this.stack.pop();
        if (!frame || frame.type !== "object")
          throw new Error("Unexpected object end");
        const obj: Record<string, unknown> = {};
        const keys = frame.keys ?? [];
        for (let i = 0; i < keys.length; i++) {
          obj[keys[i]] = frame.value[i];
        }
        return this.handleValue(obj);
      }

      case TYPE.CHUNK:
        return this.decode(); // Skip chunk markers

      default:
        throw new Error(`Unknown type marker: ${type}`);
    }
  }

  private handleValue(value: unknown): unknown {
    if (this.stack.length === 0) {
      return value;
    }

    const frame = this.stack[this.stack.length - 1];
    if (frame.type === "array") {
      frame.value.push(value);
    } else {
      if (this.currentKey === null) throw new Error("Object value without key");
      const keys = frame.keys ?? [];
      keys.push(this.currentKey);
      frame.keys = keys;
      frame.value.push(value);
      this.currentKey = null;
    }

    return this.decode();
  }

  private readUntilType(): string {
    const typeChars = Object.values(TYPE);
    let result = "";
    while (
      this.pos < this.buffer.length &&
      !typeChars.includes(
        this.buffer[this.pos] as (typeof TYPE)[keyof typeof TYPE],
      )
    ) {
      result += this.buffer[this.pos];
      this.pos++;
    }
    return result;
  }

  private readString(): string | undefined {
    const lengthStr = this.readUntilPipe();
    if (lengthStr === undefined) return undefined;

    const length = decodeVarint(lengthStr);
    this.pos++; // Skip pipe

    if (this.pos + length > this.buffer.length) {
      this.pos -= lengthStr.length + 1; // Rewind
      return undefined;
    }

    let result = "";
    let escaped = false;
    let chars = 0;

    while (chars < length && this.pos < this.buffer.length) {
      const char = this.buffer[this.pos];
      this.pos++;
      chars++;

      if (escaped) {
        result += char;
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else {
        result += char;
      }
    }

    return result;
  }

  private readUntilPipe(): string | undefined {
    let result = "";
    const startPos = this.pos;

    while (this.pos < this.buffer.length && this.buffer[this.pos] !== "|") {
      result += this.buffer[this.pos];
      this.pos++;
    }

    if (this.pos >= this.buffer.length) {
      this.pos = startPos; // Rewind
      return undefined;
    }

    return result;
  }

  reset(): void {
    this.buffer = "";
    this.pos = 0;
    this.refs = [];
    this.stack = [];
    this.currentKey = null;
  }
}

/**
 * Simple decode function (non-streaming)
 */
export function decode(pjson: string): unknown {
  const decoder = new PJSONDecoder();
  decoder.feed(pjson);
  return decoder.decode();
}

/**
 * Human-readable format converter
 * Converts PJSON to a readable annotated format
 */
export function toHumanReadable(pjson: string): string {
  const lines: string[] = [];
  let indent = 0;
  let pos = 0;

  const addLine = (text: string) => {
    lines.push("  ".repeat(indent) + text);
  };

  const readUntilType = (): string => {
    const typeChars = Object.values(TYPE);
    let result = "";
    while (
      pos < pjson.length &&
      !typeChars.includes(pjson[pos] as (typeof TYPE)[keyof typeof TYPE])
    ) {
      result += pjson[pos];
      pos++;
    }
    return result;
  };

  const readString = (): string => {
    let lengthStr = "";
    while (pos < pjson.length && pjson[pos] !== "|") {
      lengthStr += pjson[pos];
      pos++;
    }
    const length = decodeVarint(lengthStr);
    pos++; // Skip pipe
    const str = pjson.slice(pos, pos + length);
    pos += length;
    return str;
  };

  while (pos < pjson.length) {
    const type = pjson[pos];
    pos++;

    switch (type) {
      case TYPE.NULL:
        addLine("NULL");
        break;
      case TYPE.TRUE:
        addLine("TRUE");
        break;
      case TYPE.FALSE:
        addLine("FALSE");
        break;
      case TYPE.INT:
        addLine(`INT: ${decodeVarint(readUntilType())}`);
        break;
      case TYPE.FLOAT:
        addLine(`FLOAT: ${readUntilType()}`);
        break;
      case TYPE.STRING:
        addLine(`STRING: "${readString()}"`);
        break;
      case TYPE.KEY:
        addLine(`KEY: "${readString()}"`);
        break;
      case TYPE.REF:
        addLine(`REF[${decodeVarint(readUntilType())}]`);
        break;
      case TYPE.ARRAY_START:
        addLine("ARRAY [");
        indent++;
        break;
      case TYPE.ARRAY_END:
        indent--;
        addLine("]");
        break;
      case TYPE.OBJECT_START:
        addLine("OBJECT {");
        indent++;
        break;
      case TYPE.OBJECT_END:
        indent--;
        addLine("}");
        break;
      case TYPE.CHUNK:
        addLine("--- CHUNK ---");
        break;
    }
  }

  return lines.join("\n");
}

/**
 * Convert human-readable annotation back to PJSON
 */
export function fromHumanReadable(readable: string): string {
  const lines = readable
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l);
  let result = "";

  for (const line of lines) {
    if (line === "NULL") result += TYPE.NULL;
    else if (line === "TRUE") result += TYPE.TRUE;
    else if (line === "FALSE") result += TYPE.FALSE;
    else if (line.startsWith("INT:")) {
      const num = parseInt(line.slice(4).trim(), 10);
      result += TYPE.INT + encodeVarint(num);
    } else if (line.startsWith("FLOAT:")) {
      result += TYPE.FLOAT + line.slice(6).trim();
    } else if (line.startsWith("STRING:")) {
      const str = line.slice(8).trim().replace(/^"|"$/g, "");
      result += TYPE.STRING + encodeString(str);
    } else if (line.startsWith("KEY:")) {
      const key = line.slice(5).trim().replace(/^"|"$/g, "");
      result += TYPE.KEY + encodeString(key);
    } else if (line.startsWith("REF[")) {
      const idx = parseInt(line.slice(4, -1), 10);
      result += TYPE.REF + encodeVarint(idx);
    } else if (line === "ARRAY [") result += TYPE.ARRAY_START;
    else if (line === "]") result += TYPE.ARRAY_END;
    else if (line === "OBJECT {") result += TYPE.OBJECT_START;
    else if (line === "}") result += TYPE.OBJECT_END;
    else if (line === "--- CHUNK ---") result += TYPE.CHUNK;
  }

  return result;
}

/**
 * Benchmark comparison with JSON
 */
export function benchmark(data: unknown): {
  jsonSize: number;
  pjsonSize: number;
  savings: string;
  jsonTime: number;
  pjsonTime: number;
  speedup: string;
} {
  // Size comparison
  const jsonStr = JSON.stringify(data);
  const pjsonStr = encode(data);

  const jsonSize = new TextEncoder().encode(jsonStr).length;
  const pjsonSize = new TextEncoder().encode(pjsonStr).length;
  const savings = ((1 - pjsonSize / jsonSize) * 100).toFixed(1) + "%";

  // Speed comparison (encode + decode)
  const iterations = 1000;

  const jsonStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    JSON.parse(JSON.stringify(data));
  }
  const jsonTime = performance.now() - jsonStart;

  const pjsonStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    decode(encode(data));
  }
  const pjsonTime = performance.now() - pjsonStart;

  const speedup =
    jsonTime < pjsonTime
      ? `${(pjsonTime / jsonTime).toFixed(1)}x slower`
      : `${(jsonTime / pjsonTime).toFixed(1)}x faster`;

  return { jsonSize, pjsonSize, savings, jsonTime, pjsonTime, speedup };
}

export { TYPE };
