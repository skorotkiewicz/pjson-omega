/* PJSON - Minimal, Progressive & Powerful */
const B = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const w = (n: number) =>
  n >= 0 && n < 62
    ? B[n]
    : (n < 0 ? "-" : "_") + Math.abs(n).toString(36) + ";";

export const encode = (v: any) => {
  let d = new Map(),
    i = 0,
    e = (x: any): string => {
      const t = typeof x,
        r = d.get(x);
      if (x == null) return "n";
      if (t == "boolean") return x ? "t" : "f";
      if (t == "number")
        return Number.isInteger(x) ? "i" + w(x) : "l" + x + ";";
      if (t == "string")
        return r != null
          ? "r" + w(r)
          : x.length > 2 && i < 2048
            ? (d.set(x, i++), "D" + w(x.length) + x)
            : "s" + w(x.length) + x;
      if (Array.isArray(x)) return "a" + x.map(e).join("") + "c";
      let o = "o";
      for (const k in x) {
        const r = d.get(k);
        o +=
          (r != null ? "k" + w(r) : (d.set(k, i++), "m" + w(k.length) + k)) +
          e(x[k]);
      }
      return o + "c";
    };
  return e(v);
};

export const decode = (s: string) => {
  let d = new Map<number, string>(),
    p = 0,
    j = 0,
    g = () => {
      const c = s[p++],
        neg = c == "-";
      if (c == "-" || c == "_") {
        let v = "";
        while (p < s.length && s[p] != ";") v += s[p++];
        return p++, parseInt(v, 36) * (neg ? -1 : 1);
      }
      return B.indexOf(c);
    },
    f = (): any => {
      if (p >= s.length) return;
      let t = s[p++],
        l,
        v,
        k,
        o: any = {},
        a = [];
      if (t == "n") return null;
      if (t == "t") return true;
      if (t == "f") return false;
      if (t == "i") return g();
      if (t == "l") {
        let x = "";
        while (p < s.length && s[p] != ";") x += s[p++];
        p++;
        return parseFloat(x);
      }
      if (t == "s") {
        l = g();
        return s.slice(p, (p += l));
      }
      if (t == "D") {
        l = g();
        const x = s.slice(p, (p += l));
        d.set(j++, x);
        return x;
      }
      if (t == "r") return d.get(g());
      if (t == "a") {
        while (p < s.length && s[p] != "c") {
          const x = f();
          if (x !== undefined) a.push(x);
        }
        p++;
        return a;
      }
      if (t == "o") {
        while (p < s.length && s[p] != "c") {
          const m = s[p++],
            key =
              m == "m"
                ? (() => {
                    const l = g();
                    const x = s.slice(p, (p += l));
                    d.set(j++, x);
                    return x;
                  })()
                : d.get(g());
          const val = f();
          if (key !== undefined) o[key] = val;
        }
        p++;
        return o;
      }
    };
  return f();
};

export const compare = (v: any) => {
  const j = JSON.stringify(v).length,
    p = encode(v).length;
  return {
    json: j,
    pj: p,
    saved: (j ? (100 - (p / j) * 100).toFixed(0) : 0) + "%",
  };
};
