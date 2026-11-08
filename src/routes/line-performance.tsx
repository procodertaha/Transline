import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, ClipboardCopy, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  calculateAllPerformanceModels,
  calculatePerformance,
  formatComplex,
  formatPolar,
  type PerformanceInput,
  type PerformanceModel,
  type PowerFactorMode,
  validatePerformanceInput,
} from "@/lib/transline/performance";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/line-performance")({
  head: () => ({
    meta: [
      { title: "Line Performance Calculator | TransLine Calculator" },
      {
        name: "description",
        content:
          "Compare short, nominal-pi, nominal-T, and long transmission-line models with sending-end, power, efficiency, and voltage-regulation results.",
      },
      { property: "og:title", content: "Line Performance Calculator | TransLine Calculator" },
      {
        property: "og:description",
        content:
          "Calculate and compare transmission-line performance from receiving-end load and line parameters.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LinePerformance,
});

const MODELS: { id: PerformanceModel; label: string; short: string }[] = [
  { id: "short", label: "Short line", short: "Short" },
  { id: "nominal-pi", label: "Medium nominal-π", short: "Nominal-π" },
  { id: "nominal-t", label: "Medium nominal-T", short: "Nominal-T" },
  { id: "long", label: "Long line · exact", short: "Long" },
];

const INITIAL_INPUT: PerformanceInput = {
  lengthKm: 100,
  resistanceOhmKm: 0.0153,
  inductanceMhKm: 1.21,
  capacitanceNfKm: 9.58,
  frequencyHz: 50,
  receivingVoltageKv: 110,
  receivingPowerMw: 20,
  powerFactor: 0.9,
  powerFactorMode: "lagging",
};

function Field({
  label,
  unit,
  value,
  onChange,
  min,
  max,
  step = "any",
}: {
  label: string;
  unit: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      <span className="flex items-center gap-2">
        <Input
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={Number.isFinite(value) ? value : ""}
          onChange={(event) => onChange(event.currentTarget.value === "" ? Number.NaN : Number(event.currentTarget.value))}
          className="min-w-0 font-mono tabular-nums"
          aria-label={`${label} (${unit})`}
        />
        <span className="w-20 shrink-0 text-xs text-muted-foreground">{unit}</span>
      </span>
    </label>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="min-w-0 border-l-2 border-primary/40 pl-3 py-1">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 break-words font-mono text-base font-semibold tabular-nums">{value}</div>
      {detail && <div className="mt-0.5 text-xs text-muted-foreground">{detail}</div>}
    </div>
  );
}

function LinePerformance() {
  const [input, setInput] = useState<PerformanceInput>(INITIAL_INPUT);
  const [model, setModel] = useState<PerformanceModel>("nominal-pi");
  const [useCalculatorValues, setUseCalculatorValues] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const errors = useMemo(() => validatePerformanceInput(input), [input]);
  const results = useMemo(() => {
    if (errors.length) return [];
    try {
      return calculateAllPerformanceModels(input);
    } catch {
      return [];
    }
  }, [errors, input]);
  const selectedResult = useMemo(() => {
    if (errors.length) return undefined;
    try {
      return calculatePerformance(input, model);
    } catch {
      return undefined;
    }
  }, [errors, input, model]);

  const setNumber = (key: Exclude<keyof PerformanceInput, "frequencyHz" | "powerFactorMode">) =>
    (value: number) => setInput((current) => ({ ...current, [key]: value }));

  const toggleCalculatorValues = (checked: boolean) => {
    setUseCalculatorValues(checked);
    if (!checked) return;
    try {
      const saved = localStorage.getItem("transline-performance-parameters");
      if (!saved) return;
      const parsed: unknown = JSON.parse(saved);
      if (typeof parsed !== "object" || parsed === null) return;
      const values = parsed as { inductanceMhKm?: unknown; capacitanceNfKm?: unknown };
      setInput((current) => ({
        ...current,
        ...(typeof values.inductanceMhKm === "number" && Number.isFinite(values.inductanceMhKm)
          ? { inductanceMhKm: values.inductanceMhKm }
          : {}),
        ...(typeof values.capacitanceNfKm === "number" && Number.isFinite(values.capacitanceNfKm)
          ? { capacitanceNfKm: values.capacitanceNfKm }
          : {}),
      }));
    } catch {
      setUseCalculatorValues(false);
    }
  };

  const copyResults = async () => {
    if (!selectedResult) return;
    const lines = [
      `Line model: ${MODELS.find((item) => item.id === model)?.label ?? model}`,
      `Z = ${formatComplex(selectedResult.zTotal)} Ω; Y = ${formatComplex(selectedResult.yTotal)} S`,
      ...(["A", "B", "C", "D"] as const).map((key) => `${key} = ${formatPolar(selectedResult.abcd[key])}`),
      `VS = ${selectedResult.sendingVoltageKv.toFixed(4)} kV ∠ ${selectedResult.sendingVoltageAngleDeg.toFixed(2)}°`,
      `IS = ${selectedResult.sendingCurrentA.toFixed(4)} A ∠ ${selectedResult.sendingCurrentAngleDeg.toFixed(2)}°`,
      `PS = ${selectedResult.sendingPowerMw.toFixed(4)} MW; QS = ${selectedResult.sendingReactivePowerMvar.toFixed(4)} Mvar`,
      `Sending-end power factor = ${selectedResult.sendingPowerFactor.toFixed(4)}`,
      `Power loss = ${selectedResult.powerLossMw.toFixed(4)} MW; efficiency = ${selectedResult.efficiencyPercent.toFixed(2)}%`,
      `Voltage regulation = ${selectedResult.regulationPercent.toFixed(2)}%`,
      `No-load charging current = ${selectedResult.noLoadChargingCurrentA.toFixed(4)} A; Ferranti rise = ${selectedResult.ferrantiRisePercent.toFixed(2)}%`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(lines);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
    window.setTimeout(() => setCopyState("idle"), 2200);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16">
      <header className="grid-bg -mx-4 mb-8 border-b border-border bg-secondary/30 px-4 py-8">
        <div className="mx-auto max-w-6xl">
          <h1 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl">
            <Zap className="size-6 text-primary" /> Line Performance
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground sm:text-base">
            Compare four line models from the same receiving-end load. The worked example is prefilled from your notes.
          </p>
        </div>
      </header>

      <div className="space-y-8">
        <section aria-labelledby="model-heading">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="model-heading" className="text-lg font-semibold">Line model</h2>
              <p className="text-sm text-muted-foreground">Choose a model to inspect its detailed results.</p>
            </div>
            <div className="flex flex-wrap gap-1 rounded-lg bg-secondary p-1" role="group" aria-label="Line model">
              {MODELS.map((option) => (
                <Button
                  key={option.id}
                  type="button"
                  variant={model === option.id ? "default" : "ghost"}
                  size="sm"
                  className={cn("cursor-default", model !== option.id && "text-muted-foreground")}
                  onClick={() => setModel(option.id)}
                >
                  <span className="sm:hidden">{option.short}</span>
                  <span className="hidden sm:inline">{option.label}</span>
                </Button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 border-y border-border py-3 text-sm text-muted-foreground sm:grid-cols-4">
            <div><span className="font-medium text-foreground">Short:</span> series impedance only</div>
            <div><span className="font-medium text-foreground">Nominal-π:</span> shunt halves at ends</div>
            <div><span className="font-medium text-foreground">Nominal-T:</span> series halves around shunt</div>
            <div><span className="font-medium text-foreground">Long:</span> distributed parameters</div>
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-[minmax(300px,390px)_1fr]">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h2 className="text-lg font-semibold">Line &amp; load inputs</h2>
              <span className="text-xs text-muted-foreground">per phase · SI units shown</span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-4">
              <Field label="Length l" unit="km" value={input.lengthKm} onChange={setNumber("lengthKm")} min={0} />
              <Field label="Resistance R" unit="Ω/km" value={input.resistanceOhmKm} onChange={setNumber("resistanceOhmKm")} min={0} />
              <Field label="Inductance L" unit="mH/km" value={input.inductanceMhKm} onChange={setNumber("inductanceMhKm")} min={0} />
              <Field label="Capacitance C" unit="nF/km" value={input.capacitanceNfKm} onChange={setNumber("capacitanceNfKm")} min={0} />
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium">Frequency</span>
                <select
                  aria-label="Frequency"
                  value={input.frequencyHz}
                  onChange={(event) => setInput((current) => ({ ...current, frequencyHz: Number(event.currentTarget.value) as 50 | 60 }))}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value={50}>50 Hz</option>
                  <option value={60}>60 Hz</option>
                </select>
              </label>
              <Field label="Receiving voltage VR (L-L)" unit="kV" value={input.receivingVoltageKv} onChange={setNumber("receivingVoltageKv")} min={0} />
              <Field label="Receiving power PR" unit="MW · 3-phase" value={input.receivingPowerMw} onChange={setNumber("receivingPowerMw")} min={0} />
              <Field label="Power factor" unit="pf" value={input.powerFactor} onChange={setNumber("powerFactor")} min={0} max={1} step="0.01" />
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium">Power-factor direction</span>
                <select
                  aria-label="Power-factor direction"
                  value={input.powerFactorMode}
                  onChange={(event) => setInput((current) => ({ ...current, powerFactorMode: event.currentTarget.value as PowerFactorMode }))}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm capitalize focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="lagging">Lagging</option>
                  <option value="leading">Leading</option>
                  <option value="unity">Unity</option>
                </select>
              </label>
            </div>
            <label className="flex items-start gap-2 border-t border-border pt-3 text-sm">
              <Checkbox checked={useCalculatorValues} onCheckedChange={(checked) => toggleCalculatorValues(checked === true)} />
              <span>
                <span className="font-medium">Auto-fill L and C from Calculator</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">Imports the latest valid inductance and capacitance results saved in this browser.</span>
              </span>
            </label>
            {errors.length > 0 && (
              <div role="alert" className="border-l-2 border-destructive pl-3 text-sm text-destructive">
                <div className="font-semibold">Check the inputs</div>
                <ul className="mt-1 list-disc space-y-1 pl-4">{errors.map((error) => <li key={error}>{error}</li>)}</ul>
              </div>
            )}
            {input.capacitanceNfKm === 9.58 && (
              <p className="text-xs text-muted-foreground">The note’s capacitance is interpreted as 0.00958 μF/km (9.58 nF/km).</p>
            )}
          </div>

          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
              <div>
                <h2 className="text-lg font-semibold">{MODELS.find((item) => item.id === model)?.label} results</h2>
                <p className="text-xs text-muted-foreground">Per-phase phasors; sending voltage is line-to-line.</p>
              </div>
              <Button type="button" variant="outline" size="sm" className="cursor-default" onClick={copyResults} disabled={!selectedResult}>
                {copyState === "copied" ? <Check /> : <ClipboardCopy />}
                {copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy unavailable" : "Copy results"}
              </Button>
            </div>

            {selectedResult && (
              <>
                <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
                  {(["A", "B", "C", "D"] as const).map((key) => (
                    <Metric
                      key={key}
                      label={`${key} · ${key === "B" ? "Ω" : key === "C" ? "S" : "—"}`}
                      value={formatPolar(selectedResult.abcd[key])}
                      detail={formatComplex(selectedResult.abcd[key])}
                    />
                  ))}
                  <Metric label="Z total" value={`${formatComplex(selectedResult.zTotal)} Ω`} />
                  <Metric label="Y total" value={`${formatComplex(selectedResult.yTotal)} S`} />
                  <Metric label="Sending voltage VS" value={`${selectedResult.sendingVoltageKv.toFixed(3)} kV`} detail={`∠ ${selectedResult.sendingVoltageAngleDeg.toFixed(2)}° line-to-line`} />
                  <Metric label="Sending current IS" value={`${selectedResult.sendingCurrentA.toFixed(2)} A`} detail={`∠ ${selectedResult.sendingCurrentAngleDeg.toFixed(2)}°`} />
                  <Metric label="Sending power PS" value={`${selectedResult.sendingPowerMw.toFixed(3)} MW`} detail={`QS ${selectedResult.sendingReactivePowerMvar.toFixed(3)} Mvar`} />
                  <Metric label="Sending-end power factor" value={`${selectedResult.sendingPowerFactor.toFixed(4)} ${selectedResult.sendingReactivePowerMvar >= 0 ? "lagging" : "leading"}`} />
                  <Metric label="Power loss" value={`${selectedResult.powerLossMw.toFixed(4)} MW`} />
                  <Metric label="Transmission efficiency" value={`${selectedResult.efficiencyPercent.toFixed(2)}%`} />
                  <Metric label="Voltage regulation" value={`${selectedResult.regulationPercent.toFixed(2)}%`} detail={`No-load VR = ${(Math.hypot(selectedResult.noLoadReceivingVoltagePhase.re, selectedResult.noLoadReceivingVoltagePhase.im) * Math.sqrt(3) / 1000).toFixed(3)} kV`} />
                  <Metric label="No-load charging current" value={`${selectedResult.noLoadChargingCurrentA.toFixed(3)} A`} />
                  <Metric label="Ferranti rise" value={`${selectedResult.ferrantiRisePercent.toFixed(3)}%`} />
                  <Metric label="AD − BC" value={formatComplex(selectedResult.abcdDeterminant)} detail="Should equal 1 + j0" />
                </div>
                <div className="grid gap-5 border-y border-border py-5 md:grid-cols-[minmax(0,1fr)_260px]">
                  <div>
                    <h3 className="mb-2 text-sm font-semibold">ABCD relation</h3>
                    <div className="overflow-x-auto border border-border bg-secondary/30 p-3 font-mono text-sm leading-7">
                      <div className="flex items-center gap-3"><span className="shrink-0">[ VS ]</span><span className="text-muted-foreground">=</span><span className="border-y border-border px-3 py-1">A&nbsp; B<br />C&nbsp; D</span><span className="shrink-0">[ VR ]</span><span>+</span><span>[ 0 ]</span></div>
                      <div className="mt-1">VS = A·VR + B·IR</div>
                      <div>IS = C·VR + D·IR</div>
                    </div>
                    <p className="mt-2 break-words text-xs text-muted-foreground">Receiving reference: VR = {(input.receivingVoltageKv / Math.sqrt(3)).toFixed(4)} kV ∠ 0° per phase; IR = {selectedResult.receivingCurrent.re.toFixed(2)} {selectedResult.receivingCurrent.im < 0 ? "−" : "+"} j{Math.abs(selectedResult.receivingCurrent.im).toFixed(2)} A.</p>
                  </div>
                  <PhasorDiagram result={selectedResult} />
                </div>
              </>
            )}
            {!selectedResult && errors.length === 0 && <p className="text-sm text-muted-foreground">Enter valid values to calculate the line performance.</p>}
          </div>
        </section>

        <section aria-labelledby="comparison-heading">
          <div className="mb-3 border-b border-border pb-2">
            <h2 id="comparison-heading" className="text-lg font-semibold">Model comparison</h2>
            <p className="text-sm text-muted-foreground">All models use the same line and load inputs.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="p-2 font-medium">Model</th><th className="p-2 font-medium">VS (kV)</th><th className="p-2 font-medium">IS (A)</th><th className="p-2 font-medium">PS (MW)</th><th className="p-2 font-medium">η (%)</th><th className="p-2 font-medium">Regulation (%)</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result) => (
                  <tr key={result.model} className={cn("border-b border-border/70", result.model === model && "bg-secondary/50 font-medium")}>
                    <th className="p-2">{MODELS.find((item) => item.id === result.model)?.label}</th>
                    <td className="p-2 font-mono tabular-nums">{result.sendingVoltageKv.toFixed(3)}</td>
                    <td className="p-2 font-mono tabular-nums">{result.sendingCurrentA.toFixed(2)}</td>
                    <td className="p-2 font-mono tabular-nums">{result.sendingPowerMw.toFixed(3)}</td>
                    <td className="p-2 font-mono tabular-nums">{result.efficiencyPercent.toFixed(2)}</td>
                    <td className="p-2 font-mono tabular-nums">{result.regulationPercent.toFixed(2)}</td>
                  </tr>
                ))}
                {results.length === 0 && <tr><td colSpan={6} className="p-3 text-muted-foreground">Complete the inputs to compare the four models.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3 border-t border-border pt-5">
          <h2 className="text-lg font-semibold">Formulas &amp; worked steps</h2>
          <details className="border-b border-border pb-3" open>
            <summary className="cursor-default py-1 text-sm font-semibold">ABCD equations</summary>
            <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <div className="border-l-2 border-primary/40 pl-3"><strong>Short line</strong><p className="mt-1 font-mono text-muted-foreground">A = D = 1, B = Z, C = 0</p></div>
              <div className="border-l-2 border-primary/40 pl-3"><strong>Medium nominal-π</strong><p className="mt-1 font-mono text-muted-foreground">A = D = 1 + YZ/2; B = Z; C = Y(1 + YZ/4)</p></div>
              <div className="border-l-2 border-primary/40 pl-3"><strong>Medium nominal-T</strong><p className="mt-1 font-mono text-muted-foreground">A = D = 1 + YZ/2; B = Z(1 + YZ/4); C = Y</p></div>
              <div className="border-l-2 border-primary/40 pl-3"><strong>Long line · exact</strong><p className="mt-1 font-mono text-muted-foreground">γ = √(zy); Zc = √(z/y); A = D = cosh(γl); B = Zc sinh(γl); C = sinh(γl)/Zc</p></div>
            </div>
          </details>
          <details className="border-b border-border pb-3">
            <summary className="cursor-default py-1 text-sm font-semibold">{MODELS.find((item) => item.id === model)?.label} substitutions</summary>
            {selectedResult && <div className="mt-3 space-y-2 break-words font-mono text-xs leading-relaxed text-muted-foreground">
              <p>ω = 2πf = {(2 * Math.PI * input.frequencyHz).toFixed(4)} rad/s</p>
              <p>z = R + jωL = {formatComplex({ re: input.resistanceOhmKm, im: 2 * Math.PI * input.frequencyHz * input.inductanceMhKm * 1e-3 })} Ω/km</p>
              <p>y = jωC = {formatComplex({ re: 0, im: 2 * Math.PI * input.frequencyHz * input.capacitanceNfKm * 1e-9 })} S/km</p>
              <p>Z = z·l = {formatComplex(selectedResult.zTotal)} Ω; Y = y·l = {formatComplex(selectedResult.yTotal)} S</p>
              <p>VR = VR(L-L)/√3 = {input.receivingVoltageKv}/√3 = {(input.receivingVoltageKv / Math.sqrt(3)).toFixed(4)} kV ∠ 0°</p>
              <p>IR = PR/(√3·VR(L-L)·pf) = {input.receivingPowerMw}×10⁶/(√3·{input.receivingVoltageKv}×10³·{input.powerFactor}) = {Math.hypot(selectedResult.receivingCurrent.re, selectedResult.receivingCurrent.im).toFixed(3)} A ∠ {((input.powerFactorMode === "lagging" ? -1 : input.powerFactorMode === "leading" ? 1 : 0) * Math.acos(input.powerFactor) * 180 / Math.PI).toFixed(2)}°</p>
              <p>VS = A·VR + B·IR = {formatPolar(selectedResult.sendingVoltagePhase)} V per phase</p>
              <p>IS = C·VR + D·IR = {formatPolar(selectedResult.sendingCurrent)} A</p>
              {model === "long" && <p>Equivalent-π: Z′ = Zc·sinh(γl); Y′/2 = tanh(γl/2)/Zc (shown in the exact line model)</p>}
            </div>}
          </details>
          <details className="border-b border-border pb-3">
            <summary className="cursor-default py-1 text-sm font-semibold">Model assumptions</summary>
            <div className="mt-2 space-y-2 text-sm text-muted-foreground">
              <p>Short model keeps the series resistance and inductive reactance. Nominal-π places half the total shunt admittance at each end; nominal-T places half the series impedance on either side of the shunt admittance. The exact long-line model treats impedance and admittance as distributed along the route.</p>
              <p>As a rule of thumb, short-line estimates are used below about 80 km, medium-line models around 80–250 km, and the distributed model above about 250 km. These are guidance ranges; line characteristics and study requirements matter.</p>
              <p>The long-line model also has the equivalent-π form: Z′ = Zc·sinh(γl), with Y′/2 = tanh(γl/2)/Zc. For the short-line model, A = D = 1, B = Z, C = 0 exactly.</p>
            </div>
          </details>
        </section>
      </div>
    </div>
  );
}

function PhasorDiagram({ result }: { result: NonNullable<ReturnType<typeof calculatePerformance>> }) {
  const vectors = [
    { label: "VR", value: result.receivingVoltagePhase, color: "stroke-phase-b" },
    { label: "IR", value: result.receivingCurrent, color: "stroke-phase-c" },
    { label: "VS", value: result.sendingVoltagePhase, color: "stroke-primary" },
  ];
  const scaleFactor = 76 / Math.max(...vectors.map(({ value }) => Math.hypot(value.re, value.im)), 1);
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">Per-phase phasors</h3>
      <svg viewBox="0 0 240 170" role="img" aria-label="Phasor diagram of receiving voltage, receiving current, and sending voltage" className="w-full border border-border bg-secondary/20">
        <line x1="32" y1="132" x2="218" y2="132" className="stroke-border" />
        <line x1="32" y1="132" x2="32" y2="24" className="stroke-border" />
        <circle cx="32" cy="132" r="3" className="fill-foreground" />
        {vectors.map(({ label, value, color }) => {
          const x = 32 + value.re * scaleFactor;
          const y = 132 - value.im * scaleFactor;
          const dx = x - 32;
          const dy = y - 132;
          const length = Math.hypot(dx, dy) || 1;
          const head = 7;
          const bx = x - (head * dx) / length;
          const by = y - (head * dy) / length;
          const px = (head * dy) / (2 * length);
          const py = -(head * dx) / (2 * length);
          return (
            <g key={label}>
              <line x1="32" y1="132" x2={x} y2={y} className={cn("stroke-[2.5]", color)} />
              <polygon points={`${x},${y} ${bx + px},${by + py} ${bx - px},${by - py}`} className={cn("fill-current", color.replace("stroke-", "text-"))} />
              <text x={Math.min(215, x + 5)} y={Math.max(18, y - 5)} className="fill-foreground font-mono text-[11px]">{label}</text>
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
        <span className="text-phase-b">VR</span><span className="text-phase-c">IR</span><span className="text-primary">VS</span>
      </div>
    </div>
  );
}