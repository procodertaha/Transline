import { EPS0, MILE, SOLID_FACTOR, STRAND_FACTOR, dist } from "./constants";
import { buildCoords, groupsFor, labelsFor } from "./config";
import type { LineConfig, Vec2 } from "./types";
import { fmtTex } from "./format";

export interface Step {
  section: "common" | "ind" | "cap";
  title: string;
  tex: string;
  note?: string | undefined;
}

export interface CalcResult {
  errors: string[];
  labels: string[];
  coords: Vec2[];
  groups: number[][];
  distances: number[][];
  bundled: boolean;
  gmrInd: number; // per-conductor Ds (bundle-adjusted), m
  gmrCap: number; // per-conductor Ds^C, m
  gmrNote: string;
  groupGmrInd: number[];
  groupGmrCap: number[];
  pairGmds: number[]; // three-phase: [D_AB, D_BC, D_CA]; single-phase: [Dm]
  deq: number; // three-phase: GMD; single-phase: GMD between sides
  dsEqInd: number;
  dsEqCap: number;
  lPhase?: number | undefined; // H/m per phase (three-phase)
  lX?: number | undefined;
  lY?: number | undefined;
  lLoop?: number | undefined; // H/m loop (single-phase)
  lPrim: number; // primary inductance H/m (loop for single-phase, per phase for three)
  cAb?: number | undefined; // F/m line-to-line (single-phase)
  cn: number; // F/m line-to-neutral
  cnEarth?: number | undefined;
  earthDetail?: { P: number; Hm: number } | undefined;
  f: number;
  lPerKm: number;
  lPerMile: number;
  xlPerKm: number;
  xlPerMile: number;
  xlTotal: number;
  cnPerKm: number;
  cnPerMile: number;
  xcOhmKm: number;
  ichgPerKm: number;
  ichgTotal: number;
  qcPerKm: number;
  qcTotal: number;
  steps: Step[];
}

const R = String.raw;

export function validate(cfg: LineConfig, coords: Vec2[]): string[] {
  const errors: string[] = [];
  if (!(cfg.radius > 0)) errors.push("Conductor radius must be positive.");
  if (cfg.conductorType === "acsr" && !cfg.acsrUseSolid && !(cfg.acsrDs > 0))
    errors.push("Enter the manufacturer GMR (Ds) for the ACSR conductor.");
  if (cfg.conductorType === "bundled") {
    if (!(cfg.bundleSpacing > 0))
      errors.push("Bundle spacing d must be positive.");
    else if (cfg.bundleSpacing <= 2 * cfg.radius)
      errors.push("Bundle spacing d must be larger than the conductor diameter.");
  }
  const labels = labelsFor(cfg.system, cfg.circuit);
  const n = labels.length;
  for (let i = 0; i < n; i++) {
    if (!isFinite(coords[i]?.x ?? NaN) || !isFinite(coords[i]?.y ?? NaN)) {
      errors.push("All conductor coordinates must be valid numbers.");
      break;
    }
  }
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      const d = dist(coords[i]!, coords[j]!);
      if (!(d > 2 * cfg.radius))
        errors.push(
          `Distance ${labels[i]}–${labels[j]} (${d.toFixed(3)} m) must exceed the conductor diameter (${(2 * cfg.radius).toFixed(3)} m).`,
        );
    }
  if (!(cfg.lengthKm > 0)) errors.push("Line length must be positive.");
  if (!(cfg.voltageKV > 0)) errors.push("Line voltage must be positive.");
  return errors;
}

function conductorGmrInd(cfg: LineConfig): { value: number; note: string } {
  const r = cfg.radius;
  switch (cfg.conductorType) {
    case "solid":
      return { value: SOLID_FACTOR * r, note: "solid round: Ds = r' = e^(−1/4)·r = 0.7788 r" };
    case "stranded":
      return {
        value: STRAND_FACTOR[cfg.strands]! * r,
        note: `${cfg.strands}-stranded: Ds = ${STRAND_FACTOR[cfg.strands]!}·r`,
      };
    case "acsr":
      if (cfg.acsrUseSolid)
        return { value: SOLID_FACTOR * r, note: "using r' = e^(−1/4)·r = 0.7788·r instead of the table GMR" };
      return { value: cfg.acsrDs, note: "ACSR: Ds entered from the manufacturer table" };
    case "hollow":
      return { value: r, note: "thin-walled tube: Ds ≈ r" };
    case "bundled": {
      const Ds = SOLID_FACTOR * r;
      const d = cfg.bundleSpacing;
      const n = cfg.subconductors;
      const value =
        n === 2 ? Math.sqrt(Ds * d) : n === 3 ? Math.cbrt(Ds * d * d) : 1.09 * (Ds * d ** 3) ** 0.25;
      return { value, note: `bundle of ${n} solid sub-conductors` };
    }
  }
}

function conductorGmrCap(cfg: LineConfig): number {
  const r = cfg.radius;
  if (cfg.conductorType !== "bundled") return r;
  const d = cfg.bundleSpacing;
  const n = cfg.subconductors;
  return n === 2 ? Math.sqrt(r * d) : n === 3 ? Math.cbrt(r * d * d) : 1.09 * (r * d ** 3) ** 0.25;
}

/** GMR of a phase group: 1 member → self; 2 members → sqrt(self × mutual). */
function groupGmr(members: number[], memberGmr: number, coords: Vec2[]): number {
  if (members.length === 1) return memberGmr;
  return Math.sqrt(memberGmr * dist(coords[members[0]!]!, coords[members[1]!]!));
}

/** GMD between two groups: (product of all cross distances)^(1/(n·m)). */
function gmdBetween(gx: number[], gy: number[], coords: Vec2[]): number {
  let prod = 1;
  for (const i of gx) for (const j of gy) prod *= dist(coords[i]!, coords[j]!);
  return prod ** (1 / (gx.length * gy.length));
}

const unitM = (m: number) => `${fmtTex(m)}\\ \\text{m}`;

export function computeLine(cfg: LineConfig): CalcResult {
  const labels = labelsFor(cfg.system, cfg.circuit);
  const groups = groupsFor(cfg.system, cfg.circuit);
  const coords = buildCoords(cfg);
  const errors = validate(cfg, coords);
  const n = labels.length;

  const distances: number[][] = [];
  for (let i = 0; i < n; i++) {
    distances.push([]);
    for (let j = 0; j < n; j++) distances[i]!.push(dist(coords[i]!, coords[j]!));
  }

  const gmrIndRes = conductorGmrInd(cfg);
  const gmrInd = gmrIndRes.value;
  const gmrCap = conductorGmrCap(cfg);
  const bundled = cfg.conductorType === "bundled";

  const groupGmrInd = groups.map((g) => groupGmr(g, gmrInd, coords));
  const groupGmrCap = groups.map((g) => groupGmr(g, gmrCap, coords));

  const steps: Step[] = [
    {
      section: "common",
      title: "Constants",
      tex: R`\mu_0 = 4\pi\times10^{-7}\ \tfrac{\text{H}}{\text{m}},\qquad \varepsilon_0 = 8.854\times10^{-12}\ \tfrac{\text{F}}{\text{m}},\qquad f = ${fmtTex(cfg.freq)}\ \text{Hz}`,
    },
  ];

  // ---- GMD between phase groups ----
  let pairGmds: number[];
  let deq: number;
  if (cfg.system === "three") {
    pairGmds = [
      gmdBetween(groups[0]!, groups[1]!, coords),
      gmdBetween(groups[1]!, groups[2]!, coords),
      gmdBetween(groups[2]!, groups[0]!, coords),
    ];
    deq = Math.cbrt(pairGmds[0]! * pairGmds[1]! * pairGmds[2]!);
  } else {
    pairGmds = [gmdBetween(groups[0]!, groups[1]!, coords)];
    deq = pairGmds[0]!;
  }
  const dsEqInd = groupGmrInd.reduce((a, b) => a * b, 1) ** (1 / groups.length);
  const dsEqCap = groupGmrCap.reduce((a, b) => a * b, 1) ** (1 / groups.length);

  // ---- Conductor GMR step (inductance) ----
  const rCm = cfg.radius * 100;
  if (bundled) {
    const Ds0 = SOLID_FACTOR * cfg.radius;
    const d = cfg.bundleSpacing;
    const nb = cfg.subconductors;
    const bundleTex =
      nb === 2
        ? R`D_{s_b} = \sqrt{D_s\,d} = \sqrt{${fmtTex(Ds0)}\times${fmtTex(d)}} = ${unitM(gmrInd)}`
        : nb === 3
          ? R`D_{s_b} = \sqrt[3]{D_s\,d^2} = \sqrt[3]{${fmtTex(Ds0)}\times(${fmtTex(d)})^2} = ${unitM(gmrInd)}`
          : R`D_{s_b} = 1.09\,(D_s\,d^3)^{1/4} = 1.09\,(${fmtTex(Ds0)}\times(${fmtTex(d)})^3)^{1/4} = ${unitM(gmrInd)}`;
    steps.push({
      section: "ind",
      title: "GMR for inductance (bundle)",
      note: gmrIndRes.note,
      tex: R`D_s = r' = e^{-1/4}\,r = 0.7788\times${fmtTex(cfg.radius)} = ${unitM(Ds0)} \\[4pt] ${bundleTex}`,
    });
  } else {
    steps.push({
      section: "ind",
      title: "GMR for inductance Ds",
      note: gmrIndRes.note,
      tex:
        cfg.conductorType === "acsr"
          ? cfg.acsrUseSolid
            ? R`D_s = r' = 0.7788\times${fmtTex(rCm)}\ \text{cm} = ${unitM(gmrInd)}\quad (\text{using } r' = e^{-1/4}r)`
            : R`D_s = ${fmtTex(cfg.acsrDs)}\ \text{m}\quad (\text{from manufacturer table})`
          : R`D_s = ${fmtTex(cfg.conductorType === "solid" ? 0.7788 : STRAND_FACTOR[cfg.strands]!)}\times r = ${fmtTex(cfg.conductorType === "solid" ? 0.7788 : STRAND_FACTOR[cfg.strands]!)}\times${fmtTex(rCm)}\ \text{cm} = ${unitM(gmrInd)}`,
    });
  }

  // Group GMR step (double circuit)
  if (cfg.circuit === "double") {
    const pairsTex = groups
      .map((g, i) => {
        const lab = labels[g[0]!];
        const lab2 = labels[g[1]!];
        const dAA = dist(coords[g[0]!]!, coords[g[1]!]!);
        const sym = ["A", "B", "C"][i] ?? String(i);
        return R`D_{s_{${sym}}} = \sqrt{D_s\,D_{${lab}${lab2}}} = \sqrt{${fmtTex(gmrInd)}\times${fmtTex(dAA)}} = ${unitM(groupGmrInd[i]!)}`;
      })
      .join(" \\\\[4pt] ");
    steps.push({
      section: "ind",
      title: "GMR per phase group",
      note: "Two parallel conductors per phase act like a 2-strand bundle.",
      tex: pairsTex,
    });
  }

  // GMD / Deq step
  if (cfg.system === "three") {
    const sym = ["A", "B", "C"];
    const gmdLine = cfg.circuit === "double"
      ? groups.map((g, i) => {
          const j = (i + 1) % 3;
          const cross = groups[i]!.flatMap((a) => groups[j]!.map((b) => `${fmtTex(dist(coords[a]!, coords[b]!))}`)).join("\\times");
          const labA = labels[groups[i]![0]!];
          const labB = labels[groups[j]![0]!];
          return R`D_{${sym[i]}${sym[j]}} = \sqrt[${groups[i]!.length * groups[j]!.length}]{${cross}} = ${unitM(pairGmds[i]!)} \\[2pt] (${labA} \to ${labB})`;
        }).join(" \\\\[6pt] ")
      : R`D_{AB} = ${fmtTex(pairGmds[0]!)}\\quad D_{BC} = ${fmtTex(pairGmds[1]!)}\\quad D_{CA} = ${fmtTex(pairGmds[2]!)}`;
    steps.push({
      section: "ind",
      title: "GMD between phases (Deq)",
      note:
        cfg.circuit === "single" && cfg.layout === "horizontal"
          ? "Horizontal layout with equal spacing: Deq ≈ 1.26·D."
          : cfg.circuit === "single" && cfg.layout === "equilateral"
            ? "Equilateral spacing: Deq = D."
            : undefined,
      tex: R`D_{eq} = \sqrt[3]{D_{AB}\,D_{BC}\,D_{CA}} = \sqrt[3]{${fmtTex(pairGmds[0]!)}\times${fmtTex(pairGmds[1]!)}\times${fmtTex(pairGmds[2]!)}} = ${unitM(deq)} \\[6pt] ${gmdLine}`,
    });
  } else {
    const cross = groups[0]!.flatMap((a) => groups[1]!.map((b) => `${fmtTex(dist(coords[a]!, coords[b]!))}`)).join("\\times");
    steps.push({
      section: "ind",
      title: "GMD between the two sides (Dm)",
      tex: R`D_m = \sqrt[${groups[0]!.length * groups[1]!.length}]{${cross}} = ${unitM(deq)}`,
    });
  }

  // ---- Inductance ----
  let lPhase: number | undefined;
  let lX: number | undefined;
  let lY: number | undefined;
  let lLoop: number | undefined;
  if (cfg.system === "three") {
    lPhase = 2e-7 * Math.log(deq / dsEqInd);
  } else {
    lX = 2e-7 * Math.log(deq / groupGmrInd[0]!);
    lY = 2e-7 * Math.log(deq / groupGmrInd[1]!);
    lLoop = lX + lY;
  }
  const lPrim = cfg.system === "three" ? (lPhase as number) : (lLoop as number);

  const lnIndTex = R`\ln\frac{${fmtTex(deq)}}{${fmtTex(cfg.system === "three" ? dsEqInd : groupGmrInd[0]!)}} = \ln(${fmtTex(deq / (cfg.system === "three" ? dsEqInd : groupGmrInd[0]!))}) = ${fmtTex(Math.log(deq / (cfg.system === "three" ? dsEqInd : groupGmrInd[0]!)))}`;

  if (cfg.system === "three") {
    steps.push({
      section: "ind",
      title: "Inductance per phase",
      tex: R`L = 2\times10^{-7}\ln\frac{D_{eq}}{D_{s_{eq}}} = 2\times10^{-7}\,(${lnIndTex}) = ${fmtTex(lPhase!)}\ \tfrac{\text{H}}{\text{m}} \\[4pt] L = 0.2\ln\frac{D_{eq}}{D_s} = ${fmtTex(lPrim * 1e6)}\ \tfrac{\text{mH}}{\text{km}} = ${fmtTex(lPrim * MILE * 1e3)}\ \tfrac{\text{mH}}{\text{mi}}`,
    });
  } else {
    steps.push({
      section: "ind",
      title: "Inductance of each side and the loop",
      tex: R`L_x = 2\times10^{-7}\ln\frac{D_m}{D_{s_x}} = ${fmtTex(lX!)}\ \tfrac{\text{H}}{\text{m}},\quad L_y = 2\times10^{-7}\ln\frac{D_m}{D_{s_y}} = ${fmtTex(lY!)}\ \tfrac{\text{H}}{\text{m}} \\[4pt] L_{\text{loop}} = L_x + L_y = ${fmtTex(lLoop!)}\ \tfrac{\text{H}}{\text{m}} = ${fmtTex(lPrim * 1e6)}\ \tfrac{\text{mH}}{\text{km}} = ${fmtTex(lPrim * MILE * 1e3)}\ \tfrac{\text{mH}}{\text{mi}}`,
    });
  }

  const f = cfg.freq;
  const w = 2 * Math.PI * f;
  const xlPerKm = w * lPrim * 1000;
  const xlTotal = xlPerKm * cfg.lengthKm;

  steps.push({
    section: "ind",
    title: "Inductive reactance",
    tex: R`X_L = 2\pi f L = 2\pi(${fmtTex(f)})(${fmtTex(lPrim)}) = ${fmtTex(w * lPrim)}\ \Omega/\text{m} = ${fmtTex(xlPerKm)}\ \Omega/\text{km} \\[4pt] X_{L,\text{total}} = ${fmtTex(xlPerKm)}\times${fmtTex(cfg.lengthKm)}\ \text{km} = ${fmtTex(xlTotal)}\ \Omega`,
  });

  // ---- Capacitance ----
  let cn: number;
  let cAb: number | undefined;
  let cnEarth: number | undefined;
  let earthDetail: { P: number; Hm: number } | undefined;

  if (cfg.system === "three") {
    cn = 2 * Math.PI * EPS0 / Math.log(deq / dsEqCap);
    if (cfg.earthEffect) {
      const rep = groups.map((g) => coords[g[0]!]!);
      const H = rep.map((p) => p.y);
      const d12 = dist(rep[0]!, rep[1]!);
      const d23 = dist(rep[1]!, rep[2]!);
      const d31 = dist(rep[2]!, rep[0]!);
      const H12 = Math.sqrt(d12 * d12 + 4 * H[0]! * H[1]!);
      const H23 = Math.sqrt(d23 * d23 + 4 * H[1]! * H[2]!);
      const H31 = Math.sqrt(d31 * d31 + 4 * H[2]! * H[0]!);
      const P = Math.cbrt(H12 * H23 * H31);
      const Hm = Math.cbrt(H[0]! * H[1]! * H[2]!);
      if (H.every((h) => h > 0)) {
        earthDetail = { P, Hm };
        cnEarth = (2 * Math.PI * EPS0) / (Math.log(deq / dsEqCap) - Math.log(P / Hm));
        steps.push({
          section: "cap",
          title: "Earth correction (image method)",
          note: "Heights H are the conductor heights above ground; Hij are image distances.",
          tex: R`H_{12} = \sqrt{D_{12}^2 + 4H_1H_2} = ${fmtTex(H12)},\quad H_{23} = ${fmtTex(H23)},\quad H_{31} = ${fmtTex(H31)} \\[4pt] C_n = \dfrac{2\pi\varepsilon_0}{\ln(D_{eq}/r) - \ln\left(\sqrt[3]{\dfrac{H_{12}H_{23}H_{31}}{H_1H_2H_3}}\right)} = \dfrac{2\pi\varepsilon_0}{${fmtTex(Math.log(deq / dsEqCap))} - \ln(${fmtTex(P / Hm)})} = ${fmtTex(cnEarth!)}\ \tfrac{\text{F}}{\text{m}}`,
        });
      } else {
        steps.push({
          section: "cap",
          title: "Earth correction unavailable",
          note: "All conductor heights (y coordinates) must be above ground to apply the image method.",
          tex: R`H_1, H_2, H_3 > 0\ \text{required}`,
        });
      }
    }
  } else {
    const gC = Math.sqrt(groupGmrCap[0]! * groupGmrCap[1]!);
    cAb = Math.PI * EPS0 / Math.log(deq / gC);
    cn = 2 * cAb;
  }

  const capSymSelf = cfg.system === "three" ? "D_{s_{eq}}^C" : cfg.circuit === "double" ? "\\sqrt{D_{s_x}^C D_{s_y}^C}" : "r";
  if (cfg.system === "single" && cfg.circuit === "single") {
    steps.push({
      section: "cap",
      title: "GMR for capacitance",
      note: "For capacitance the GMR is the actual outer radius r — internal flux plays no role in the external electric field.",
      tex: R`D_s^C = r = ${fmtTex(rCm)}\ \text{cm} = ${unitM(gmrCap)}`,
    });
    steps.push({
      section: "cap",
      title: "Capacitance line-to-line and line-to-neutral",
      tex: R`C_{ab} = \frac{\pi\varepsilon_0}{\ln(D/r)} = \frac{\pi(8.854\times10^{-12})}{\ln(${fmtTex(deq / gmrCap)})} = ${fmtTex(cAb!)}\ \tfrac{\text{F}}{\text{m}} \\[6pt] C_n = 2C_{ab} = \frac{2\pi\varepsilon_0}{\ln(D/r)} = ${fmtTex(cn)}\ \tfrac{\text{F}}{\text{m}} = ${fmtTex(cn * 1e12)}\ \tfrac{\text{nF}}{\text{km}}`,
    });
  } else if (cfg.system === "single") {
    const dxCap = dist(coords[groups[0]![0]!]!, coords[groups[0]![1]!]!);
    const dyCap = dist(coords[groups[1]![0]!]!, coords[groups[1]![1]!]!);
    steps.push({
      section: "cap",
      title: "GMR for capacitance per side",
      note: "Replace Ds by r in the group GMR — the outer radius governs the external field.",
      tex: R`D_{s_x}^C = \sqrt{r\,D_{aa'}} = \sqrt{${fmtTex(cfg.radius)}\times${fmtTex(dxCap)}} = ${unitM(groupGmrCap[0]!)},\quad D_{s_y}^C = \sqrt{r\,D_{bb'}} = ${unitM(groupGmrCap[1]!)}`,
    });
    steps.push({
      section: "cap",
      title: "Capacitance line-to-line and line-to-neutral",
      tex: R`C_{ab} = \frac{\pi\varepsilon_0}{\ln(D_m/\sqrt{D_{s_x}^C D_{s_y}^C})} = \frac{\pi(8.854\times10^{-12})}{\ln(${fmtTex(deq / Math.sqrt(groupGmrCap[0]! * groupGmrCap[1]!))})} = ${fmtTex(cAb!)}\ \tfrac{\text{F}}{\text{m}} \\[6pt] C_n = 2C_{ab} = ${fmtTex(cn)}\ \tfrac{\text{F}}{\text{m}} = ${fmtTex(cn * 1e12)}\ \tfrac{\text{nF}}{\text{km}}`,
    });
  } else {
    steps.push({
      section: "cap",
      title: "GMR for capacitance",
      note: bundled
        ? "For capacitance use the outer radius r in the bundle formulas."
        : "For capacitance the GMR is the actual outer radius r — internal flux plays no role in the external electric field.",
      tex: bundled
        ? cfg.subconductors === 2
          ? R`D_{s_b}^C = \sqrt{r\,d} = \sqrt{${fmtTex(cfg.radius)}\times${fmtTex(cfg.bundleSpacing)}} = ${unitM(gmrCap)}`
          : cfg.subconductors === 3
            ? R`D_{s_b}^C = \sqrt[3]{r\,d^2} = ${unitM(gmrCap)}`
            : R`D_{s_b}^C = 1.09\,(r\,d^3)^{1/4} = ${unitM(gmrCap)}`
        : R`D_s^C = r = ${fmtTex(rCm)}\ \text{cm} = ${unitM(gmrCap)}`,
    });
    if (cfg.circuit === "double") {
      steps.push({
        section: "cap",
        title: "Group GMR for capacitance",
        tex: groups
          .map((g, i) => {
            const dAA = dist(coords[g[0]!]!, coords[g[1]!]!);
            const sym = ["A", "B", "C"][i];
            return R`D_{s_{${sym}}}^C = \sqrt{r\,D_{{${labels[g[0]!]}${labels[g[1]!]}}}} = \sqrt{${fmtTex(cfg.radius)}\times${fmtTex(dAA)}} = ${unitM(groupGmrCap[i]!)}`;
          })
          .join(" \\\\ [4pt] "),
      });
    }
    steps.push({
      section: "cap",
      title: "Capacitance to neutral",
      tex: R`C_n = \frac{2\pi\varepsilon_0}{\ln(D_{eq}/${capSymSelf})} = \frac{2\pi(8.854\times10^{-12})}{\ln(${fmtTex(deq / dsEqCap)})} = ${fmtTex(cn)}\ \tfrac{\text{F}}{\text{m}} = ${fmtTex(cn * 1e12)}\ \tfrac{\text{nF}}{\text{km}} = ${fmtTex(cn * 1e9)}\ \tfrac{\text{\textmu F}}{\text{km}}`,
    });
  }

  const cnPerKm = cn * 1000;
  const xcOhmKm = 1 / (w * cnPerKm);
  const VLL = cfg.voltageKV * 1e3;
  const vln = VLL / Math.sqrt(3);
  const ichgPerKm = w * cnPerKm * vln;
  const qcPerKm = w * cnPerKm * VLL * VLL;

  steps.push({
    section: "cap",
    title: "Capacitive reactance and charging",
    tex: R`X_C = \frac{1}{2\pi f C_n} = \frac{1}{2\pi(${fmtTex(f)})(${fmtTex(cnPerKm)})} = ${fmtTex(xcOhmKm)}\ \Omega\cdot\text{km} \\[6pt] I_{\text{chg}} = 2\pi f C_n V_{LN} = 2\pi(${fmtTex(f)})(${fmtTex(cnPerKm)})(${fmtTex(vln / 1000)}\ \text{kV}) = ${fmtTex(ichgPerKm)}\ \text{A/km} \\[6pt] Q_c = 3V_{LN}^2\,(2\pi f C_n) = V_{LL}^2\,(2\pi f C_n) = ${fmtTex(qcPerKm / 1000)}\ \text{kvar/km}`,
  });

  const cnUsed = cnEarth ?? cn;
  const cnPerKmUsed = cnUsed * 1000;
  const cnPerMile = cnUsed * MILE;
  const ichgTotal = ichgPerKm * cfg.lengthKm;
  const qcTotal = qcPerKm * cfg.lengthKm;

  return {
    errors,
    labels,
    coords,
    groups,
    distances,
    bundled,
    gmrInd,
    gmrCap,
    gmrNote: gmrIndRes.note,
    groupGmrInd,
    groupGmrCap,
    pairGmds,
    deq,
    dsEqInd,
    dsEqCap,
    lPhase,
    lX,
    lY,
    lLoop,
    lPrim,
    cAb,
    cn,
    cnEarth,
    earthDetail,
    f,
    lPerKm: lPrim * 1000,
    lPerMile: lPrim * MILE,
    xlPerKm,
    xlPerMile: w * lPrim * MILE,
    xlTotal,
    cnPerKm: cnPerKmUsed,
    cnPerMile,
    xcOhmKm: 1 / (w * cnPerKmUsed),
    ichgPerKm,
    ichgTotal,
    qcPerKm,
    qcTotal,
    steps,
  };
}
