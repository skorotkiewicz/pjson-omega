/* PJ Ultra - Maximum Density Machine Protocol */

const B =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&'()*+,-./:;<=>?@[\\]^_`{|}~";
const numEnc = (v: number): string => {
  if (v === 0) return "0|";
  const neg = v < 0;
  let abs = Math.floor(Math.abs(v));
  let r = "";
  while (abs > 0) {
    r = B[abs % 92] + r;
    abs = Math.floor(abs / 92);
  }
  return `${neg ? "~" : ""}${r}|`;
};

export const encode = (v: unknown): string => {
  const d = new Map<unknown, number>();
  let nId = 0;
  const e = (x: unknown): string => {
    const t = typeof x;
    const r = d.get(x);
    if (x === null || x === undefined) return "n";
    if (t === "boolean") return x ? "t" : "f";
    if (t === "number") {
      const num = x as number;
      return Number.isInteger(num) ? `i${numEnc(num)}` : `l${num}|`;
    }
    if (t === "string") {
      const s = x as string;
      if (r !== undefined) return `r${numEnc(r)}`;
      if (s.length > 2 && nId < 2048) {
        d.set(s, nId++);
        return `D${numEnc(s.length)}${s}`;
      }
      return `s${numEnc(s.length)}${s}`;
    }
    if (Array.isArray(x)) {
      let out = `a${numEnc(x.length)}`;
      for (const item of x) out += e(item);
      return out;
    }
    if (t === "object") {
      const obj = x as Record<string, unknown>;
      const keys = Object.keys(obj);
      let out = `o${numEnc(keys.length)}`;
      for (const k of keys) {
        const rK = d.get(k);
        if (rK !== undefined) {
          out += `k${numEnc(rK)}`;
        } else {
          d.set(k, nId++);
          out += `m${numEnc(k.length)}${k}`;
        }
        out += e(obj[k]);
      }
      return out;
    }
    return "n";
  };
  return e(v);
};

export const decode = (s: string): unknown => {
  const d = new Map<number, string>();
  let p = 0;
  let nId = 0;

  const readNum = (): number => {
    if (p >= s.length) return 0;
    const neg = s[p] === "~";
    if (neg) p++;
    let r = 0;
    while (p < s.length && s[p] !== "|") {
      const idx = B.indexOf(s[p]);
      if (idx === -1) break;
      r = r * 92 + idx;
      p++;
    }
    p++; // skip |
    return neg ? -r : r;
  };

  const f = (): unknown => {
    if (p >= s.length) return undefined;
    const t = s[p++];
    if (t === "n") return null;
    if (t === "t") return true;
    if (t === "f") return false;
    if (t === "i") return readNum();
    if (t === "l") {
      let x = "";
      while (p < s.length && s[p] !== "|") x += s[p++];
      p++;
      return parseFloat(x);
    }
    if (t === "s" || t === "D") {
      const len = readNum();
      const r = s.slice(p, p + len);
      p += len;
      if (t === "D" && r.length === len) d.set(nId++, r);
      return r;
    }
    if (t === "r") return d.get(readNum());
    if (t === "a") {
      const len = readNum();
      const a: unknown[] = [];
      for (let i = 0; i < len; i++) {
        if (p >= s.length) break;
        const x = f();
        if (x !== undefined) a.push(x);
      }
      return a;
    }
    if (t === "o") {
      const len = readNum();
      const o: Record<string, unknown> = {};
      for (let i = 0; i < len; i++) {
        if (p >= s.length) break;
        const mt = s[p++];
        let key: string | undefined;
        if (mt === "m") {
          const kl = readNum();
          key = s.slice(p, p + kl);
          p += kl;
          if (key.length === kl) d.set(nId++, key);
        } else if (mt === "k") {
          key = d.get(readNum());
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
