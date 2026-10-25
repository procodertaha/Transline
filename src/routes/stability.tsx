import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
  Area,
} from "recharts";
import { UploadCloud } from "lucide-react";
import { TeX } from "@/components/transline/TeX";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/stability")({
  head: () => ({
    meta: [
      { title: "Stability — Power-Angle & Swing Equation | TransLine Calculator" },
      {
        name: "description",
        content:
          "Power-angle curve, swing equation and equal-area criterion with interactive sliders — see how double circuits raise the stability limit.",
      },
      {
        property: "og:title",
        content: "Stability — Power-Angle & Swing Equation | TransLine Calculator",
      },
      {
        property: "og:description",
        content:
          "Interactive equal-area criterion and swing-curve simulation for transmission line stability.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Stability,
});

const inputCls =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono tabular-nums outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30";
const labelCls = "mb-1 block text-xs font-medium text-muted-foreground";

function Field({
  label,
  value,
  onChange,
  suffix,
  step = "any",
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  step?: string;
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="relative">
        <input
          type="number"
          step={step}
          value={Number.isFinite(value) ? value : ""}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className={cn(inputCls, suffix && "pr-12")}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
        <span className="font-mono text-xs tabular-nums">{format ? format(value) : value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-[var(--color-primary)]"
      />
    </div>
  );
}

interface Params {
  xLine: number;
  xDouble: number;
  xGen: number;
  xTraf: number;
  eKV: number;
  vKV: number;
  pmMW: number;
  hConst: number;
  freq: number;
  faultFactor: number;
  tClear: number;
}

function StabilityCharts({ p }: { p: Params }) {
  const data = useMemo(() => {
    const Xt = p.xGen + p.xTraf + p.xLine;
    const XtD = p.xGen + p.xTraf + p.xDouble;
    if (!(Xt > 0) || !(XtD > 0)) return { curve: [], pmax: 0, pmaxD: 0 };
    const pmax = (p.eKV * p.vKV) / Xt;
    const pmaxD = (p.eKV * p.vKV) / XtD;
    const curve: {
      deg: number;
      P: number;
      PmaxD: number;
      s1: number;
      s2: number;
      s3: number;
    }[] = [];
    for (let deg = 0; deg <= 180; deg += 2) {
      const rad = (deg * Math.PI) / 180;
      const P = pmax * Math.sin(rad);
      const s1 = Math.min(P, p.pmMW);
      const s2 = Math.max(P - p.pmMW, 0);
      const s3 = Math.max(p.pmMW - P, 0);
      curve.push({ deg, P, PmaxD: pmaxD * Math.sin(rad), s1, s2, s3 });
    }
    return { curve, pmax, pmaxD };
  }, [p]);

  const { d0, dmax, dcr } = useMemo(() => {
    const Xt = p.xGen + p.xTraf + p.xLine;
    const pmax = (p.eKV * p.vKV) / Xt;
    const ratio = p.pmMW / pmax;
    if (!(ratio > 0 && ratio < 1)) return { d0: NaN, dmax: NaN, dcr: NaN };
    const d0 = Math.asin(ratio);
    const dmax = Math.PI - d0;
    const dcr = Math.acos(ratio * (dmax - d0) + Math.cos(dmax));
    return { d0, dmax, dcr };
  }, [p]);

  const swing = useMemo(() => {
    const Xt = p.xGen + p.xTraf + p.xLine;
    if (!(Xt > 0)) return { points: [], stable: false };
    const pmax = (p.eKV * p.vKV) / Xt;
    const pmPu = p.pmMW / pmax;
    if (!(pmPu > 0 && pmPu < 1)) return { points: [], stable: false };
    const d0 = Math.asin(pmPu);
    const ws = 2 * Math.PI * p.freq;
    const dt = 0.002;
    let delta = d0;
    let dw = 0;
    const points: { t: number; delta: number }[] = [{ t: 0, delta: (d0 * 180) / Math.PI }];
    let stable = true;
    const nSteps = Math.round(2 / dt);
    for (let i = 1; i <= nSteps; i++) {
      const t = i * dt;
      const pePu = (s: number) =>
        (t <= p.tClear ? p.faultFactor : 1) * Math.sin(s);
      const accel = (s: number, w: number) => (ws / (2 * p.hConst)) * (pmPu - pePu(s));
      // RK4
      const k1d = dw;
      const k1w = accel(delta, dw);
      const k2d = dw + (dt / 2) * k1w;
      const k2w = accel(delta + (dt / 2) * k1d, dw + (dt / 2) * k1w);
      const k3d = dw + (dt / 2) * k2w;
      const k3w = accel(delta + (dt / 2) * k2d, dw + (dt / 2) * k2w);
      const k4d = dw + dt * k3w;
      const k4w = accel(delta + dt * k3d, dw + dt * k3w);
      delta += (dt / 6) * (k1d + 2 * k2d + 2 * k3d + k4d);
      dw += (dt / 6) * (k1w + 2 * k2w + 2 * k3w + k4w);
      if (delta > Math.PI + 0.5) {
        stable = false;
        points.push({ t, delta: (delta * 180) / Math.PI });
        break;
      }
      if (i % 10 === 0) points.push({ t, delta: (delta * 180) / Math.PI });
    }
    return { points, stable };
  }, [p]);

  const deg = (r: number) => (isNaN(r) ? NaN : (r * 180) / Math.PI);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 text-sm font-semibold">Power–angle curve & equal areas</h3>
        <div className="h-72 rounded-xl border border-border bg-card p-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data.curve} margin={{ top: 10, right: 16, bottom: 12, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="deg"
                type="number"
                domain={[0, 180]}
                tickFormatter={(v: number) => `${v}°`}
                stroke="var(--color-muted-foreground)"
                fontSize={11}
              />
              <YAxis
                stroke="var(--color-muted-foreground)"
                fontSize={11}
                tickFormatter={(v: number) => `${v}`}
                width={52}
                label={{ value: "MW", angle: -90, position: "insideLeft", fontSize: 11 }}
              />
              <RTooltip
                formatter={(v: number, name: string) => [`${v.toFixed(1)} MW`, name]}
                labelFormatter={(l: number) => `δ = ${l}°`}
                contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area
                dataKey="s1"
                stackId="1"
                stroke="none"
                fill="transparent"
                isAnimationActive={false}
                name=" "
              />
              <Area
                dataKey="s2"
                stackId="1"
                stroke="none"
                fill="var(--color-chart-1)"
                fillOpacity={0.3}
                isAnimationActive={false}
                name="Accelerating area"
              />
              <Area
                dataKey="s3"
                stackId="1"
                stroke="none"
                fill="var(--color-chart-3)"
                fillOpacity={0.35}
                isAnimationActive={false}
                name="Decelerating area"
              />
              <Line
                dataKey="P"
                stroke="var(--color-primary)"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
                name={`P (X = ${p.xLine} Ω), Pmax = ${data.pmax.toFixed(0)} MW`}
              />
              <Line
                dataKey="PmaxD"
                stroke="var(--color-chart-2)"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
                isAnimationActive={false}
                name={`Double circuit, Pmax = ${data.pmaxD.toFixed(0)} MW`}
              />
              <ReferenceLine
                y={p.pmMW}
                stroke="var(--color-foreground)"
                strokeDasharray="4 4"
                label={{ value: `Pm = ${p.pmMW} MW`, fontSize: 11, position: "right" }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            { label: "δ₀ (operating)", value: deg(d0) },
            { label: "δ_max", value: deg(dmax) },
            { label: "δ_cr (critical clearing)", value: deg(dcr) },
          ].map((c) => (
            <div key={c.label} className="rounded-lg border border-border bg-card p-2.5 text-center">
              <div className="text-[11px] font-medium text-muted-foreground">{c.label}</div>
              <div className="font-mono text-sm font-semibold tabular-nums">
                {isNaN(c.value) ? "—" : `${c.value.toFixed(1)}°`}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">
          Swing curve δ(t) — fault cleared at t = {p.tClear} s
        </h3>
        <div className="h-64 rounded-xl border border-border bg-card p-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={swing.points} margin={{ top: 10, right: 16, bottom: 12, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="t"
                type="number"
                domain={[0, 2]}
                tickFormatter={(v: number) => `${v}s`}
                stroke="var(--color-muted-foreground)"
                fontSize={11}
              />
              <YAxis
                stroke="var(--color-muted-foreground)"
                fontSize={11}
                width={52}
                tickFormatter={(v: number) => `${v}°`}
              />
              <RTooltip
                formatter={(v: number) => [`${v.toFixed(1)}°`, "δ"]}
                labelFormatter={(l: number) => `t = ${l.toFixed(2)} s`}
                contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }}
              />
              <ReferenceLine
                y={deg(dcr)}
                stroke="var(--color-warning)"
                strokeDasharray="4 4"
                label={{ value: "δcr", fontSize: 11, position: "right" }}
              />
              <Line
                dataKey="delta"
                stroke={swing.stable ? "var(--color-success)" : "var(--color-destructive)"}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div
          className={cn(
            "mt-2 rounded-lg border p-2.5 text-xs font-medium",
            swing.stable
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              : "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400",
          )}
        >
          {swing.stable
            ? "Stable — the rotor angle oscillates and settles below δmax. Increase the clearing time and watch it diverge."
            : "Unstable — the rotor angle runs away (pole slip). Reduce the clearing time or Pm."}
        </div>
      </div>
    </div>
  );
}

function Stability() {
  const [p, setP] = useState<Params>({
    xLine: 42,
    xDouble: 24,
    xGen: 18,
    xTraf: 10,
    eKV: 1.1 * 220,
    vKV: 220,
    pmMW: 300,
    hConst: 5,
    freq: 50,
    faultFactor: 0,
    tClear: 0.25,
  });
  const loadedRef = useRef(false);

  // Pull the line reactance computed by the calculator.
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    try {
      const v = parseFloat(localStorage.getItem("transline:xl-total") ?? "");
      if (isFinite(v) && v > 0) setP((s) => ({ ...s, xLine: v, xDouble: v / 2 }));
    } catch {
      /* ignore */
    }
  }, []);

  const set = (patch: Partial<Params>) => setP((s) => ({ ...s, ...patch }));
  const Xt = p.xGen + p.xTraf + p.xLine;
  const pmax = Xt > 0 ? (p.eKV * p.vKV) / Xt : NaN;
  const pmaxD = p.xGen + p.xTraf + p.xDouble > 0 ? (p.eKV * p.vKV) / (p.xGen + p.xTraf + p.xDouble) : NaN;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16">
      <header className="grid-bg -mx-4 mb-8 border-b border-border bg-secondary/30 px-4 py-8">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Stability module (Ch. 16)
          </h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Power–angle curve, swing equation and equal-area criterion. The line
            reactance X is prefilled from the calculator — adjust the machine
            and transformer reactances, then explore the sliders.
          </p>
        </div>
      </header>

      <TeX
        block
        className="mb-6 rounded-xl border border-border bg-card p-4 text-center"
        math={`P = \\frac{|E|\\,|V|}{X_{\\text{total}}}\\sin\\delta,\\qquad P_{\\max} = \\frac{|E|\\,|V|}{X_{\\text{total}}},\\qquad \\frac{2H}{\\omega_s}\\frac{d^2\\delta}{dt^2} = P_m - P_{\\max}\\sin\\delta`}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(300px,360px)_1fr]">
        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Reactances</h3>
              <button
                type="button"
                onClick={() => {
                  try {
                    const v = parseFloat(localStorage.getItem("transline:xl-total") ?? "");
                    if (isFinite(v) && v > 0) set({ xLine: v, xDouble: v / 2 });
                  } catch {
                    /* ignore */
                  }
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-primary/40 bg-primary/5 px-2 py-1 text-xs font-medium text-primary transition hover:bg-primary/10"
              >
                <UploadCloud className="size-3.5" />
                Load from calculator
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Line X (single circuit)" value={p.xLine} onChange={(v) => set({ xLine: v })} suffix="Ω" />
              <Field label="Line X (double circuit)" value={p.xDouble} onChange={(v) => set({ xDouble: v })} suffix="Ω" />
              <Field label="Generator X'd" value={p.xGen} onChange={(v) => set({ xGen: v })} suffix="Ω" />
              <Field label="Transformer X" value={p.xTraf} onChange={(v) => set({ xTraf: v })} suffix="Ω" />
            </div>
            <div className="mt-3 rounded-lg bg-secondary/60 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">X_total</span>
                <span className="font-mono tabular-nums">{Xt.toFixed(1)} Ω</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span className="text-muted-foreground">Pmax (single circuit)</span>
                <span className="font-mono font-semibold tabular-nums">{isNaN(pmax) ? "—" : `${pmax.toFixed(0)} MW`}</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span className="text-muted-foreground">Pmax (double circuit)</span>
                <span className="font-mono font-semibold tabular-nums text-[var(--color-chart-2)]">
                  {isNaN(pmaxD) ? "—" : `${pmaxD.toFixed(0)} MW`}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                The double circuit lowers X and raises the stability limit by{" "}
                {isNaN(pmaxD) || isNaN(pmax) ? "—" : `${(((pmaxD - pmax) / pmax) * 100).toFixed(0)}%`}.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold">System & fault</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="|E| (internal EMU, LL)" value={p.eKV} onChange={(v) => set({ eKV: v })} suffix="kV" />
              <Field label="|V| (terminal, LL)" value={p.vKV} onChange={(v) => set({ vKV: v })} suffix="kV" />
            </div>
            <div className="mt-4 space-y-4">
              <Slider label="Mechanical power Pm" value={p.pmMW} min={0} max={pmax * 0.99 || 100} step={5} onChange={(v) => set({ pmMW: v })} format={(v) => `${v} MW`} />
              <Slider label="Inertia constant H" value={p.hConst} min={1} max={12} step={0.5} onChange={(v) => set({ hConst: v })} format={(v) => `${v} MJ/MVA`} />
              <Slider label="Fault power factor (during fault)" value={p.faultFactor} min={0} max={0.8} step={0.05} onChange={(v) => set({ faultFactor: v })} format={(v) => v.toFixed(2)} />
              <Slider label="Clearing time" value={p.tClear} min={0.02} max={1} step={0.01} onChange={(v) => set({ tClear: v })} format={(v) => `${v.toFixed(2)} s`} />
            </div>
          </div>

          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-xs text-muted-foreground">
            <div className="font-semibold text-primary">δcr formula</div>
            <TeX block className="mt-2" math={`\\delta_{cr} = \\arccos\\left[\\frac{P_m}{P_{\\max}}(\\delta_{\\max} - \\delta_0) + \\cos\\delta_{\\max}\\right]`} />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <ClientOnly fallback={<div className="h-[36rem] animate-pulse rounded-xl bg-secondary" />}>
            <StabilityCharts p={p} />
          </ClientOnly>
        </div>
      </div>
    </div>
  );
}
