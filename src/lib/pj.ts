/* PJSON - Minimal, Progressive & Powerful */
const B = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const w = (n: number) =>
  n >= 0 && n < 62 ? B[n] : `${n < 0 ? "-" : "_"}${Math.abs(n).toString(36)};`;

export const encode = (v: unknown): string => {
  const d = new Map<unknown, number>();
  let i = 0;
  const e = (x: unknown): string => {
    const t = typeof x;
    const r = d.get(x);
    if (x === null || x === undefined) return "n";
    if (t === "boolean") return x ? "t" : "f";
    if (t === "number") {
      const num = x as number;
      return Number.isInteger(num) ? `i${w(num)}` : `l${num};`;
    }
    if (t === "string") {
      const s = x as string;
      if (r !== undefined) return `r${w(r)}`;
      if (s.length > 2 && i < 2048) {
        d.set(s, i);
        const out = `D${w(s.length)}${s}`;
        i++;
        return out;
      }
      return `s${w(s.length)}${s}`;
    }
    if (Array.isArray(x)) return `a${x.map(e).join("")}c`;
    if (t === "object") {
      const obj = x as Record<string, unknown>;
      let o = "o";
      for (const k in obj) {
        if (Object.hasOwn(obj, k)) {
          const rK = d.get(k);
          if (rK !== undefined) {
            o += `k${w(rK)}`;
          } else {
            d.set(k, i);
            o += `m${w(k.length)}${k}`;
            i++;
          }
          o += e(obj[k]);
        }
      }
      return `${o}c`;
    }
    return "n";
  };
  return e(v);
};

export const decode = (s: string): unknown => {
  const d = new Map<number, string>();
  let p = 0;
  let j = 0;
  const g = (): number => {
    const c = s[p];
    p++;
    const neg = c === "-";
    if (c === "-" || c === "_") {
      let valStr = "";
      while (p < s.length && s[p] !== ";") {
        valStr += s[p];
        p++;
      }
      p++; // Skip semicolon
      return parseInt(valStr, 36) * (neg ? -1 : 1);
    }
    return B.indexOf(c);
  };
  const f = (): unknown => {
    if (p >= s.length) return undefined;
    const t = s[p];
    p++;
    if (t === "n") return null;
    if (t === "t") return true;
    if (t === "f") return false;
    if (t === "i") return g();
    if (t === "l") {
      let x = "";
      while (p < s.length && s[p] !== ";") {
        x += s[p];
        p++;
      }
      p++;
      return parseFloat(x);
    }
    if (t === "s") {
      const len = g();
      const r = s.slice(p, p + len);
      p += len;
      return r;
    }
    if (t === "D") {
      const len = g();
      const r = s.slice(p, p + len);
      p += len;
      d.set(j, r);
      j++;
      return r;
    }
    if (t === "r") return d.get(g());
    if (t === "a") {
      const a: unknown[] = [];
      while (p < s.length && s[p] !== "c") {
        const x = f();
        if (x !== undefined) a.push(x);
      }
      p++;
      return a;
    }
    if (t === "o") {
      const o: Record<string, unknown> = {};
      while (p < s.length && s[p] !== "c") {
        const m = s[p];
        p++;
        let key: string | undefined;
        if (m === "m") {
          const len = g();
          key = s.slice(p, p + len);
          p += len;
          d.set(j, key);
          j++;
        } else {
          key = d.get(g());
        }
        const val = f();
        if (key !== undefined) o[key] = val;
      }
      p++;
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
