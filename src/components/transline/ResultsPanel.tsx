import { useEffect, useState } from "react";
import { CheckCircle2, ClipboardCopy, Download, FileText } from "lucide-react";
import type { CalcResult, Step } from "@/lib/transline/calc";
import { isSelfCheck } from "@/lib/transline/config";
import type { LineConfig } from "@/lib/transline/types";
import { fmtFixed, fmtNum, fmtUi } from "@/lib/transline/format";
import { TeX } from "./TeX";
import { cn } from "@/lib/utils";

function StepAccordion({ steps }: { steps: Step[] }) {
  const [open, setOpen] = useState<Set<number>>(new Set());
  const toggle = (i: number) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });
  const allOpen = open.size === steps.length;
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(allOpen ? new Set() : new Set(steps.map((_, i) => i)))}
        className="mb-2 text-xs font-medium text-primary underline-offset-2 hover:underline"
      >
        {allOpen ? "Hide all steps" : "Show all steps"}
      </button>
      <div className="space-y-2">
        {steps.map((s, i) => (
          <div key={i} className="overflow-hidden rounded-xl border border-border bg-card">
            <button
              type="button"
              onClick={() => toggle(i)}
              className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm font-medium hover:bg-secondary/50"
            >
              <span>
                <span className="mr-2 font-mono text-xs text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {s.title}
              </span>
              <svg
                className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open.has(i) && "rotate-180")}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            {open.has(i) && (
              <div className="border-t border-border bg-secondary/30 px-4 py-3">
                <TeX math={s.tex} block />
                {s.note && (
                  <p className="mt-2 text-xs text-muted-foreground">{s.note}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Value({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-mono text-base font-semibold tabular-nums text-foreground">
        {value}
        {unit && <span className="ml-1 text-xs font-normal text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}

function summaryText(cfg: LineConfig, res: CalcResult, tab: "ind" | "cap"): string {
  const lines: string[] = [];
  lines.push("TransLine Calculator — Results");
  lines.push(
    `${cfg.system === "three" ? "Three-phase" : "Single-phase"}, ${cfg.circuit === "double" ? "double" : "single"} circuit, ${cfg.conductorType} conductor`,
  );
  lines.push(`r = ${fmtNum(cfg.radius)} m, f = ${cfg.freq} Hz, length = ${cfg.lengthKm} km, V_LL = ${cfg.voltageKV} kV`);
  lines.push("");
  if (tab === "ind") {
    lines.push(`Ds (inductance) = ${fmtNum(res.gmrInd)} m`);
    if (cfg.circuit === "double") {
      lines.push(`Phase-group GMRs: ${res.groupGmrInd.map((g) => fmtNum(g)).join(", ")} m`);
    }
    lines.push(`${cfg.system === "three" ? "Deq (GMD)" : "Dm (GMD)"} = ${fmtNum(res.deq)} m`);
    if (cfg.system === "single") {
      lines.push(`Lx = ${fmtNum(res.lX!)} H/m, Ly = ${fmtNum(res.lY!)} H/m`);
      lines.push(`L (loop) = ${fmtNum(res.lLoop!)} H/m = ${fmtNum(res.lLoop! * 1e6)} mH/km`);
    } else {
      lines.push(`L = ${fmtNum(res.lPhase!)} H/m = ${fmtNum(res.lPhase! * 1e6)} mH/km`);
    }
    lines.push(`XL = ${fmtNum(res.xlPerKm)} ohm/km; total for ${cfg.lengthKm} km = ${fmtNum(res.xlTotal)} ohm`);
  } else {
    lines.push(`Ds^C (capacitance) = ${fmtNum(res.gmrCap)} m`);
    if (cfg.circuit === "double") {
      lines.push(`Group GMRs (cap): ${res.groupGmrCap.map((g) => fmtNum(g)).join(", ")} m`);
    }
    lines.push(`${cfg.system === "three" ? "Deq" : "Dm"} = ${fmtNum(res.deq)} m`);
    lines.push(`Cn = ${fmtNum(res.cn)} F/m = ${fmtNum(res.cn * 1e12)} nF/km`);
    if (res.cnEarth) lines.push(`Cn with earth = ${fmtNum(res.cnEarth)} F/m = ${fmtNum(res.cnEarth * 1e12)} nF/km`);
    lines.push(`Xc = ${fmtNum(res.xcOhmKm)} ohm·km`);
    lines.push(`I_chg = ${fmtNum(res.ichgPerKm)} A/km; total = ${fmtNum(res.ichgTotal)} A`);
    lines.push(`Qc = ${fmtNum(res.qcPerKm / 1000)} kvar/km; total = ${fmtNum(res.qcTotal / 1e6)} Mvar`);
  }
  lines.push("");
  lines.push("Ds (inductance) uses r' = 0.7788·r — internal flux linkage.");
  lines.push("Ds^C (capacitance) uses r — only the external field matters.");
  lines.push("Grainger & Stevenson, Power System Analysis, McGraw-Hill");
  return lines.join("\n");
}

export function ResultsPanel({
  cfg,
  res,
  tab,
}: {
  cfg: LineConfig;
  res: CalcResult;
  tab: "ind" | "cap";
}) {
  const [copied, setCopied] = useState(false);

  // Hand the total line reactance to the stability module.
  useEffect(() => {
    if (tab === "ind") {
      try {
        localStorage.setItem("transline:xl-total", String(res.xlTotal));
      } catch {
        /* ignore */
      }
    }
  }, [res.xlTotal, tab]);

  if (res.errors.length > 0) {
    return (
      <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
        <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-amber-600 dark:text-amber-400">
          Check your inputs
        </div>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {res.errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      </div>
    );
  }

  const selfCheck = isSelfCheck(cfg);
  const lMhKm = res.lPrim * 1e6;
  const cnNfKm = res.cnPerKm * 1e9;

  const downloadPdf = async () => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    const text = summaryText(cfg, res, tab);
    doc.setFontSize(11);
    doc.splitTextToSize(text, 180).forEach((line: string, i: number) => {
      doc.text(line, 15, 20 + i * 6);
    });
    doc.save("transline-results.pdf");
  };

  const copy = async () => {
    await navigator.clipboard.writeText(summaryText(cfg, res, tab));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const steps = res.steps.filter((s) =>
    tab === "ind" ? s.section !== "cap" : s.section !== "ind",
  );

  return (
    <div className="space-y-5">
      {selfCheck && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div className="text-sm">
            <div className="font-semibold text-emerald-700 dark:text-emerald-400">
              Built-in self-check
            </div>
            <div className="mt-1 text-muted-foreground">
              Textbook example (solid r = 1 cm, horizontal 5 m, 50 Hz): expected L ≈ 1.339 mH/km
              and C ≈ 8.63 nF/km. Computed: L = {fmtUi(lMhKm, 4)} mH/km, C = {fmtUi(cnNfKm, 4)} nF/km —{" "}
              {Math.abs(lMhKm - 1.339) < 0.01 && Math.abs(cnNfKm - 8.63) < 0.05
                ? "matches the reference values."
                : "check the geometry inputs."}
            </div>
          </div>
        </div>
      )}

      {tab === "ind" ? (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            <Value label="Ds (inductance)" value={fmtUi(res.gmrInd)} unit="m" />
            {cfg.circuit === "double" &&
              res.groupGmrInd.map((g, i) => (
                <Value
                  key={i}
                  label={`Group GMR ${["X/A", "Y/B", "C"][i] ?? i + 1}`}
                  value={fmtUi(g)}
                  unit="m"
                />
              ))}
            <Value
              label={cfg.system === "three" ? "Deq (GMD)" : "Dm (GMD)"}
              value={fmtUi(res.deq)}
              unit="m"
            />
            <Value label="L" value={fmtUi(res.lPrim * 1e9)} unit="nH/m" />
            <Value label="L per km" value={fmtUi(lMhKm)} unit="mH/km" />
            <Value label="L per mile" value={fmtUi(res.lPerMile * 1e3)} unit="mH/mi" />
            <Value label="XL per km" value={fmtUi(res.xlPerKm)} unit="Ω/km" />
            <Value label="XL per mile" value={fmtUi(res.xlPerMile)} unit="Ω/mi" />
            <Value
              label={`XL total (${fmtFixed(cfg.lengthKm, 1)} km)`}
              value={fmtUi(res.xlTotal)}
              unit="Ω"
            />
            {cfg.system === "single" && (
              <>
                <Value label="Lx (side x)" value={fmtUi(res.lX! * 1e6)} unit="mH/km" />
                <Value label="Ly (side y)" value={fmtUi(res.lY! * 1e6)} unit="mH/km" />
              </>
            )}
          </div>
          {cfg.circuit === "double" && tab === "ind" && (
            <details className="rounded-xl border border-border bg-card p-4 text-sm">
              <summary className="cursor-pointer font-medium">Distance matrix (m)</summary>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[420px] text-center font-mono text-xs">
                  <thead>
                    <tr>
                      <th className="p-1" />
                      {res.labels.map((l) => (
                        <th key={l} className="p-1 text-primary">{l}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {res.distances.map((row, i) => (
                      <tr key={i}>
                        <th className="p-1 text-primary">{res.labels[i]}</th>
                        {row.map((d, j) => (
                          <td key={j} className="p-1 text-muted-foreground">
                            {i === j ? "—" : fmtNum(d, 3)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          <Value label="Ds^C (capacitance)" value={fmtUi(res.gmrCap)} unit="m" />
          <Value
            label={cfg.system === "three" ? "Deq (GMD)" : "Dm (GMD)"}
            value={fmtUi(res.deq)}
            unit="m"
          />
          <Value label="Cn" value={fmtUi(res.cn * 1e12)} unit="pF/m" />
          <Value label="Cn per km" value={fmtUi(cnNfKm)} unit="nF/km" />
          <Value label="Cn per mile" value={fmtUi(res.cnPerMile * 1e9)} unit="nF/mi" />
          <Value label="Cn per km" value={fmtUi(res.cnPerKm * 1e6)} unit="µF/km" />
          <Value label="Xc" value={fmtUi(res.xcOhmKm)} unit="Ω·km" />
          <Value label="I_chg per km" value={fmtUi(res.ichgPerKm)} unit="A/km" />
          <Value
            label={`I_chg total (${fmtFixed(cfg.lengthKm, 1)} km)`}
            value={fmtUi(res.ichgTotal)}
            unit="A"
          />
          <Value label="Qc per km" value={fmtUi(res.qcPerKm / 1000)} unit="kvar/km" />
          <Value label="Qc total" value={fmtUi(res.qcTotal / 1e6)} unit="Mvar" />
          {res.cnEarth && (
            <Value label="Cn with earth" value={fmtUi(res.cnEarth * 1e12)} unit="nF/km" />
          )}
        </div>
      )}

      {/* Ds vs Ds^C comparison */}
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          <FileText className="size-4" />
          Ds (inductance) vs Ds^C (capacitance)
        </div>
        <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
          <div className="rounded-lg bg-card p-3">
            <span className="font-mono font-semibold">Ds = {fmtUi(res.gmrInd)} m</span>
            <p className="mt-1 text-xs text-muted-foreground">
              Inductance includes the flux linking the conductor interior — hence r' = 0.7788·r for solid round.
            </p>
          </div>
          <div className="rounded-lg bg-card p-3">
            <span className="font-mono font-semibold">Ds^C = {fmtUi(res.gmrCap)} m</span>
            <p className="mt-1 text-xs text-muted-foreground">
              Capacitance depends only on the external electric field, so the actual outer radius r is used — never 0.7788·r.
            </p>
          </div>
        </div>
      </div>

      {/* Export */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium transition hover:bg-accent"
        >
          {copied ? <CheckCircle2 className="size-4 text-emerald-600" /> : <ClipboardCopy className="size-4" />}
          {copied ? "Copied" : "Copy results"}
        </button>
        <button
          type="button"
          onClick={downloadPdf}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          <Download className="size-4" />
          Export PDF
        </button>
      </div>

      <div>
        <h4 className="mb-2 text-sm font-semibold">Worked solution</h4>
        <StepAccordion steps={steps} />
      </div>
    </div>
  );
}
