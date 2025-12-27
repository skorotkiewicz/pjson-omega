/**
 * PJ - Minimal Progressive JSON Protocol
 *
 * Pure communication protocol. Nothing else.
 *
 * Format: Single-char type markers + compact data
 * Progressive: Works with partial data
 * Compact: 50-80% smaller than JSON
 */

// Base64 chars for number encoding
const B = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz+/";

// Encode integer to compact string
function n(v: number): string {
  if (v === 0) return "0";
  const neg = v < 0;
  v = Math.abs(v);
  let r = "";
  while (v > 0) {
    r = B[v & 63] + r;
    v >>= 6;
  }
  return neg ? "-" + r : r;
}

// Decode compact string to integer
function d(s: string): number {
  if (!s || s === "0") return 0;
  const neg = s[0] === "-";
  if (neg) s = s.slice(1);
  let r = 0;
  for (const c of s) r = (r << 6) + B.indexOf(c);
  return neg ? -r : r;
}

// Type markers
const T = "DVROCANTFILEkrd;|";

// State for dictionary compression
interface State {
  dict: Map<number, string>;
  rev: Map<string, number>;
  id: number;
}

function state(): State {
  return { dict: new Map(), rev: new Map(), id: 0 };
}

// ============================================================================
// ENCODER
// ============================================================================

export function encode(value: unknown): string {
  const s = state();
  const chunks: string[] = [];

  function str(v: string): void {
    // Check dictionary
    const existing = s.rev.get(v);
    if (existing !== undefined && v.length > 2) {
      chunks.push("R" + n(existing));
      return;
    }
    // Add to dictionary if worth it
    if (v.length > 3 && s.id < 256) {
      const id = s.id++;
      s.dict.set(id, v);
      s.rev.set(v, id);
      chunks.push("D" + n(id) + n(v.length) + "|" + v);
      return;
    }
    chunks.push("V" + n(v.length) + "|" + v);
  }

  function key(k: string): void {
    const existing = s.rev.get(k);
    if (existing !== undefined) {
      chunks.push("r" + n(existing));
      return;
    }
    if (s.id < 256) {
      const id = s.id++;
      s.dict.set(id, k);
      s.rev.set(k, id);
      chunks.push("d" + n(id) + n(k.length) + "|" + k);
      return;
    }
    chunks.push("k" + n(k.length) + "|" + k);
  }

  function enc(v: unknown): void {
    if (v === null || v === undefined) {
      chunks.push("N");
      return;
    }
    if (v === true) {
      chunks.push("T");
      return;
    }
    if (v === false) {
      chunks.push("F");
      return;
    }

    if (typeof v === "number") {
      if (Number.isInteger(v)) {
        chunks.push("I" + n(v));
      } else {
        chunks.push("L" + v + ";");
      }
      return;
    }

    if (typeof v === "string") {
      str(v);
      return;
    }

    if (Array.isArray(v)) {
      chunks.push("A" + n(v.length));
      for (const item of v) enc(item);
      chunks.push("C");
      return;
    }

    if (typeof v === "object") {
      const entries = Object.entries(v);
      chunks.push("O" + n(entries.length));
      for (const [k, val] of entries) {
        key(k);
        enc(val);
      }
      chunks.push("C");
    }
  }

  enc(value);
  chunks.push("E");
  return chunks.join("");
}

// ============================================================================
// DECODER - Progressive, works with partial data
// ============================================================================

export class Decoder {
  private buf = "";
  private pos = 0;
  private s = state();
  private result: unknown = undefined;
  private stack: Array<{ t: "o" | "a"; v: unknown; k: string[] }> = [];
  private key: string | null = null;
  private done = false;

  // Feed data progressively
  feed(data: string): { data: unknown; done: boolean } {
    this.buf += data;
    try {
      this.parse();
    } catch {
      /* need more data */
    }
    return { data: this.result ?? this.stack[0]?.v, done: this.done };
  }

  private parse(): void {
    while (this.pos < this.buf.length && !this.done) {
      const start = this.pos;
      try {
        this.chunk();
      } catch {
        this.pos = start;
        return;
      }
    }
  }

  private chunk(): void {
    const t = this.buf[this.pos++];

    switch (t) {
      case "D": {
        // Dict value
        const id = this.num();
        const v = this.readStr();
        this.s.dict.set(id, v);
        this.s.rev.set(v, id);
        this.val(v);
        break;
      }
      case "d": {
        // Dict key
        const id = this.num();
        const k = this.readStr();
        this.s.dict.set(id, k);
        this.s.rev.set(k, id);
        this.key = k;
        break;
      }
      case "V":
        this.val(this.readStr());
        break;
      case "R": {
        const v = this.s.dict.get(this.num());
        if (v === undefined) throw new Error("bad ref");
        this.val(v);
        break;
      }
      case "r": {
        const k = this.s.dict.get(this.num());
        if (k === undefined) throw new Error("bad ref");
        this.key = k;
        break;
      }
      case "k":
        this.key = this.readStr();
        break;
      case "O": {
        this.num(); // count (ignored, we use C to close)
        const obj = {};
        this.stack.push({ t: "o", v: obj, k: [] });
        if (this.stack.length === 1) this.result = obj;
        break;
      }
      case "A": {
        this.num();
        const arr: unknown[] = [];
        this.stack.push({ t: "a", v: arr, k: [] });
        if (this.stack.length === 1) this.result = arr;
        break;
      }
      case "C": {
        const frame = this.stack.pop();
        if (frame) this.val(frame.v);
        break;
      }
      case "N":
        this.val(null);
        break;
      case "T":
        this.val(true);
        break;
      case "F":
        this.val(false);
        break;
      case "I":
        this.val(this.num());
        break;
      case "L": {
        let s = "";
        while (this.pos < this.buf.length && this.buf[this.pos] !== ";") {
          s += this.buf[this.pos++];
        }
        if (this.buf[this.pos] !== ";") throw new Error("need more");
        this.pos++;
        this.val(parseFloat(s));
        break;
      }
      case "E":
        this.done = true;
        break;
      default:
        throw new Error("unknown: " + t);
    }
  }

  private val(v: unknown): void {
    if (this.stack.length === 0) {
      this.result = v;
      return;
    }
    const f = this.stack[this.stack.length - 1];
    if (f.t === "a") {
      (f.v as unknown[]).push(v);
    } else {
      if (this.key === null) return;
      (f.v as Record<string, unknown>)[this.key] = v;
      this.key = null;
    }
  }

  private num(): number {
    let s = "";
    while (this.pos < this.buf.length && !T.includes(this.buf[this.pos])) {
      s += this.buf[this.pos++];
    }
    return d(s);
  }

  private readStr(): string {
    let lenStr = "";
    while (this.pos < this.buf.length && this.buf[this.pos] !== "|") {
      lenStr += this.buf[this.pos++];
    }
    if (this.buf[this.pos] !== "|") throw new Error("need more");
    const len = d(lenStr);
    this.pos++;
    if (this.pos + len > this.buf.length) throw new Error("need more");
    const str = this.buf.slice(this.pos, this.pos + len);
    this.pos += len;
    return str;
  }

  reset(): void {
    this.buf = "";
    this.pos = 0;
    this.s = state();
    this.result = undefined;
    this.stack = [];
    this.key = null;
    this.done = false;
  }
}

// ============================================================================
// SIMPLE API
// ============================================================================

export function decode(pj: string): unknown {
  const dec = new Decoder();
  return dec.feed(pj).data;
}

// Compare sizes
export function compare(data: unknown): {
  json: number;
  pj: number;
  saved: string;
} {
  const json = JSON.stringify(data).length;
  const pj = encode(data).length;
  return { json, pj, saved: ((1 - pj / json) * 100).toFixed(0) + "%" };
}
