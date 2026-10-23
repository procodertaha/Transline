const SUP: Record<string, string> = {
  "-": "\u207B",
  "0": "\u2070",
  "1": "\u00B9",
  "2": "\u00B2",
  "3": "\u00B3",
  "4": "\u2074",
  "5": "\u2075",
  "6": "\u2076",
  "7": "\u2077",
  "8": "\u2078",
  "9": "\u2079",
};

function supers(s: string): string {
  return s
    .split("")
    .map((c) => SUP[c] ?? c)
    .join("");
}

/** Plain scientific formatting: "1.339" or "8.629e-12". */
export function fmtNum(x: number, sig = 4): string {
  if (!isFinite(x)) return "—";
  if (x === 0) return "0";
  const ax = Math.abs(x);
  if (ax >= 1e6 || ax < 1e-4) {
    const e = Math.floor(Math.log10(ax));
    return `${(x / 10 ** e).toPrecision(sig)}e${e}`;
  }
  return parseFloat(x.toPrecision(sig)).toString();
}

/** UI formatting with unicode superscripts: "8.629×10⁻¹²". */
export function fmtUi(x: number, sig = 4): string {
  if (!isFinite(x)) return "—";
  if (x === 0) return "0";
  const ax = Math.abs(x);
  if (ax >= 1e6 || ax < 1e-4) {
    const e = Math.floor(Math.log10(ax));
    return `${(x / 10 ** e).toPrecision(sig)}×10${supers(String(e))}`;
  }
  return parseFloat(x.toPrecision(sig)).toString();
}

/** KaTeX formatting: "1.339" or "8.629\times10^{-12}". */
export function fmtTex(x: number, sig = 4): string {
  if (!isFinite(x)) return "\\text{—}";
  if (x === 0) return "0";
  const ax = Math.abs(x);
  if (ax >= 1e6 || ax < 1e-4) {
    const e = Math.floor(Math.log10(ax));
    return `${(x / 10 ** e).toPrecision(sig)}\\times10^{${e}}`;
  }
  return parseFloat(x.toPrecision(sig)).toString();
}

/** Fixed decimals, thousands separated. */
export function fmtFixed(x: number, decimals = 2): string {
  if (!isFinite(x)) return "—";
  return x.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
