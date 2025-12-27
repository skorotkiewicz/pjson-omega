/* PJ - Minimalist Progressive JSON Protocol */

export const encode = (v: any): string => {
  let d = new Map(),
    i = 0,
    o = "",
    e = (x: any) => {
      if (x == null) o += "n";
      else if (x === true) o += "t";
      else if (x === false) o += "f";
      else if (typeof x == "number") o += (x % 1 ? "l" : "i") + x + "|";
      else if (typeof x == "string") {
        const r = d.get(x);
        if (r != null) o += "r" + r + "|";
        else if (x.length > 2 && i < 128) {
          d.set(x, i);
          o += "d" + i++ + "|" + x.length + "|" + x;
        } else o += "s" + x.length + "|" + x;
      } else if (Array.isArray(x)) {
        o += "a";
        x.forEach(e);
        o += "c";
      } else {
        o += "o";
        Object.entries(x).forEach(([k, val]) => {
          const r = d.get(k);
          if (r != null) o += "k" + r + "|";
          else {
            d.set(k, i);
            o += "m" + i++ + "|" + k.length + "|" + k;
          }
          e(val);
        });
        o += "c";
      }
    };
  e(v);
  return o;
};

export const decode = (s: string): any => {
  let d = new Map<number, string>(),
    p = 0,
    n = () => {
      let v = "";
      while (p < s.length && s[p] != "|") v += s[p++];
      p++;
      return v;
    },
    v = (): any => {
      const t = s[p++];
      if (t == "n") return null;
      if (t == "t") return true;
      if (t == "f") return false;
      if (t == "i" || t == "l") return +n();
      if (t == "s") {
        const l = +n();
        const r = s.slice(p, p + l);
        p += l;
        return r;
      }
      if (t == "d") {
        const i = +n(),
          l = +n(),
          x = s.slice(p, p + l);
        p += l;
        d.set(i, x);
        return x;
      }
      if (t == "r") return d.get(+n());
      if (t == "a") {
        const a: any[] = [];
        while (s[p] != "c") a.push(v());
        p++;
        return a;
      }
      if (t == "o") {
        const o: any = {};
        while (s[p] != "c") {
          const t = s[p++],
            k =
              t == "m"
                ? (() => {
                    const i = +n(),
                      l = +n(),
                      x = s.slice(p, p + l);
                    p += l;
                    d.set(i, x);
                    return x;
                  })()
                : d.get(+n());
          o[k!] = v();
        }
        p++;
        return o;
      }
    };
  return v();
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
