/* PJ OMEGA - Ultimate Machine Density */

const B =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&'()*+,-./:;<=>?@[\\]^`{|}~ ";

/**
 * NUM_MAP (93 Chars):
 * 0-50: Small Integers (0-50)
 * 51-60: Array Lengths (0-9)
 * 61-70: Object Lengths (0-9)
 * 71: null (n)
 * 72: true (t)
 * 73: false (f)
 * 74: large integer (i)
 * 75: float (l)
 * 76: string (s)
 * 77: dictionary string (D)
 * 78: array large (a)
 * 79: object large (o)
 * 80: reference (r)
 * 81: key definition (m)
 * 82: key reference (k)
 * 83: date (d)
 * 84: structural reference (R)
 */

const numEnc = (v: number | bigint): string => {
  if (typeof v === "number" && v >= 0 && v <= 50) return B[v];
  const neg = v < 0;
  let abs = v < BigInt(0) ? -BigInt(v) : BigInt(v);
  let r = "";
  if (abs === BigInt(0)) return B[0];
  while (abs > BigInt(0)) {
    r = B[Number(abs % BigInt(91))] + r;
    abs = abs / BigInt(91);
  }
  return `${neg ? "~" : "_"}${r}z`;
};

export const encode = (v: unknown): string => {
  const d = new Map<unknown, number>();
  let nId = 0;

  const e = (x: unknown): string => {
    if (x === null || x === undefined) return B[71];
    const t = typeof x;
    const r = d.get(x);
    if (t === "boolean") return x ? B[72] : B[73];
    if (t === "number") {
      const num = x as number;
      if (Number.isInteger(num)) {
        return num >= 0 && num <= 50 ? B[num] : `${B[74]}${numEnc(num)}`;
      }
      // Float bit-packing (pure bit-stream to alphabet)
      const buffer = new BigUint64Array([0n]);
      new Float64Array(buffer.buffer)[0] = num;
      return `${B[75]}${numEnc(buffer[0])}`;
    }
    if (t === "string") {
      const s = x as string;
      if (r !== undefined) return `${B[80]}${numEnc(r)}`;
      if (s.length > 2 && nId < 4096) {
        d.set(s, nId++);
        return `${B[77]}${numEnc(s.length)}${s}`;
      }
      return `${B[76]}${numEnc(s.length)}${s}`;
    }
    if (x instanceof Date) return `${B[83]}${numEnc(x.getTime())}`;

    // Complex Structural Reference check
    if (r !== undefined && (t === "object" || Array.isArray(x))) {
      return `${B[84]}${numEnc(r)}`;
    }

    if (Array.isArray(x)) {
      if (nId < 4096) d.set(x, nId++);
      let out =
        x.length < 10 ? B[51 + x.length] : `${B[78]}${numEnc(x.length)}`;
      for (const item of x) out += e(item);
      return out;
    }
    if (t === "object") {
      if (nId < 4096) d.set(x, nId++);
      const obj = x as Record<string, unknown>;
      const keys = Object.keys(obj);
      let out =
        keys.length < 10
          ? B[61 + keys.length]
          : `${B[79]}${numEnc(keys.length)}`;
      for (const k of keys) {
        const rK = d.get(k);
        if (rK !== undefined) out += `${B[82]}${numEnc(rK)}`;
        else {
          d.set(k, nId++);
          out += `${B[81]}${numEnc(k.length)}${k}`;
        }
        out += e(obj[k]);
      }
      return out;
    }
    return B[71];
  };
  return e(v);
};

export const decode = (s: string): unknown => {
  const d = new Map<number, unknown>();
  let p = 0;
  let nId = 0;

  const readBig = (): bigint => {
    if (p >= s.length) return BigInt(0);
    const first = s[p++];
    const fIdx = BigInt(B.indexOf(first));
    if (first !== "_" && first !== "~") return fIdx;
    const neg = first === "~";
    let r = BigInt(0);
    while (p < s.length && s[p] !== "z") {
      r = r * BigInt(91) + BigInt(B.indexOf(s[p++]));
    }
    if (s[p] === "z") p++;
    return neg ? -r : r;
  };

  const readNum = (): number => Number(readBig());

  const f = (): unknown => {
    if (p >= s.length) return undefined;
    const t = s[p++];
    const tIdx = B.indexOf(t);

    if (tIdx >= 0 && tIdx <= 50) return tIdx;
    if (tIdx === 71) return null;
    if (tIdx === 72) return true;
    if (tIdx === 73) return false;
    if (tIdx === 74) return readNum();
    if (tIdx === 75) {
      const bits = readBig();
      const buffer = new BigUint64Array([bits]);
      return new Float64Array(buffer.buffer)[0];
    }
    if (tIdx === 76 || tIdx === 77) {
      const len = readNum();
      const r = s.slice(p, p + len);
      p += len;
      if (tIdx === 77 && r.length === len) d.set(nId++, r);
      return r;
    }
    if (tIdx === 80 || tIdx === 84) return d.get(readNum());
    if (tIdx === 83) return new Date(readNum());

    if (tIdx === 78 || (tIdx >= 51 && tIdx <= 60)) {
      const len = tIdx >= 51 && tIdx <= 60 ? tIdx - 51 : readNum();
      const a: unknown[] = [];
      const id = nId++;
      d.set(id, a);
      for (let i = 0; i < len; i++) {
        if (p >= s.length) break;
        const val = f();
        if (val !== undefined) a.push(val);
      }
      return a;
    }

    if (tIdx === 79 || (tIdx >= 61 && tIdx <= 70)) {
      const len = tIdx >= 61 && tIdx <= 70 ? tIdx - 61 : readNum();
      const o: Record<string, unknown> = {};
      const id = nId++;
      d.set(id, o);
      for (let i = 0; i < len; i++) {
        if (p >= s.length) break;
        const mt = s[p++];
        const mtIdx = B.indexOf(mt);
        let key: string | undefined;
        if (mtIdx === 81) {
          const kl = readNum();
          key = s.slice(p, p + kl);
          p += kl;
          if (key.length === kl) d.set(nId++, key);
        } else if (mtIdx === 82) {
          key = d.get(readNum()) as string;
        }
        const val = f();
        if (key !== undefined) o[key] = val;
      }
      return o;
    }

    return undefined;
  };

  return f();
};

export const compare = (v: unknown) => {
  const jsonStr = JSON.stringify(v);
  const jLen = jsonStr ? jsonStr.length : 0;
  const pLen = encode(v).length;
  return {
    json: jLen,
    pj: pLen,
    saved: `${jLen ? (100 - (pLen / jLen) * 100).toFixed(0) : "0"}%`,
  };
};
