import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { buildCoords, isValidAsymmetricTriangle, labelsFor } from "@/lib/transline/config";
import { STRAND_FACTOR } from "@/lib/transline/constants";
import type { CalcResult } from "@/lib/transline/calc";
import { fmtUi } from "@/lib/transline/format";
import { RADIUS_UNITS, type LineConfig, type StrandCount, type SubConductorCount, type Vec2 } from "@/lib/transline/types";
import { cn } from "@/lib/utils";

const inputCls =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono tabular-nums outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30";
const labelCls = "mb-1 block text-xs font-medium text-muted-foreground";

function NumField({
  label,
  value,
  onChange,
  step = "any",
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: string;
  suffix?: string;
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="relative">
        <input
          type="number"
          step={step}
          min={0}
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

function UnitSelect({
  value,
  onChange,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  ariaLabel: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-input bg-background px-2 text-sm"
      aria-label={ariaLabel}
    >
      {RADIUS_UNITS.map((u) => (
        <option key={u.label}>{u.label}</option>
      ))}
    </select>
  );
}

/** Numeric field with a unit selector; stores metres, converts at the input edge. */
function UnitField({
  label,
  value,
  onChange,
  unit,
  onUnitChange,
  step = "0.1",
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit: string;
  onUnitChange: (v: string) => void;
  step?: string;
}) {
  const factor = RADIUS_UNITS.find((u) => u.label === unit)!.factor;
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="flex gap-2">
        <input
          type="number"
          step={step}
          min={0}
          value={
            Number.isFinite(value)
              ? parseFloat((value / factor).toPrecision(6))
              : ""
          }
          onChange={(e) => onChange(parseFloat(e.target.value) * factor)}
          className={inputCls}
          aria-label={label}
        />
        <UnitSelect
          value={unit}
          onChange={onUnitChange}
          ariaLabel={`${label} unit`}
        />
      </div>
    </div>
  );
}

function Segmented<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg bg-secondary p-1">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "flex-1 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition",
            value === o.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function InputPanel({
  cfg,
  update,
  res,
  conductorTitle,
}: {
  cfg: LineConfig;
  update: (patch: Partial<LineConfig>) => void;
  res: CalcResult;
  conductorTitle: string;
}) {
  const [rUnit, setRUnit] = useState("cm");
  const [dsUnit, setDsUnit] = useState("m");
  const [bsUnit, setBsUnit] = useState("m");
  const rFactor = RADIUS_UNITS.find((u) => u.label === rUnit)!.factor;
  const dsFactor = RADIUS_UNITS.find((u) => u.label === dsUnit)!.factor;
  const [dUnit, setDUnit] = useState("m");
  const [hUnit, setHUnit] = useState("m");
  const [coordUnit, setCoordUnit] = useState("m");
  const labels = labelsFor(cfg.system, cfg.circuit);
  const coordFactor = RADIUS_UNITS.find((u) => u.label === coordUnit)!.factor;
  const coords = buildCoords(cfg);
  const isCustom =
    cfg.system === "three" && cfg.circuit === "single"
      ? cfg.layout === "custom"
      : cfg.doublePreset === "custom";

  const setCoord = (i: number, axis: "x" | "y", v: number) => {
    const next: Vec2[] = coords.map((p, k) =>
      k === i ? { ...p, [axis]: v } : { ...p },
    );
    if (cfg.system === "three" && cfg.circuit === "single") {
      update({ layout: "custom", coords: next });
    } else if (cfg.circuit === "double") {
      update({ doublePreset: "custom", coords: next });
    } else {
      update({ layout: "custom", coords: next });
    }
  };

  return (
    <div className="space-y-5">
      {/* Conductor */}
      <section>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Conductor
        </h4>
        <div className="mb-3 rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-primary">{conductorTitle}</span>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              GMR picked automatically
            </span>
          </div>
          <p className="mt-1 text-muted-foreground">{res.gmrNote}</p>
          <div className="mt-2 font-mono tabular-nums text-foreground">
            Ds (inductance) = {fmtUi(res.gmrInd)} m
            <span className="mx-2 text-muted-foreground">·</span>
            Ds^C (capacitance) = {fmtUi(res.gmrCap)} m
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Outer radius r</label>
            <div className="flex gap-2">
              <input
                type="number"
                step="any"
                min={0}
                value={cfg.radius / rFactor}
                onChange={(e) =>
                  update({ radius: parseFloat(e.target.value) * rFactor })
                }
                className={inputCls}
              />
              <select
                value={rUnit}
                onChange={(e) => setRUnit(e.target.value)}
                className="rounded-lg border border-input bg-background px-2 text-sm"
                aria-label="Radius unit"
              >
                {RADIUS_UNITS.map((u) => (
                  <option key={u.label}>{u.label}</option>
                ))}
              </select>
            </div>
          </div>
          {cfg.conductorType === "stranded" && (
            <div>
              <label className={labelCls}>Stranding</label>
              <select
                value={cfg.strands}
                onChange={(e) =>
                  update({ strands: Number(e.target.value) as StrandCount })
                }
                className={inputCls}
              >
                {[7, 19, 37, 61, 91].map((s) => (
                  <option key={s} value={s}>
                    {s}-strand (Ds = {STRAND_FACTOR[s]}·r)
                  </option>
                ))}
              </select>
            </div>
          )}
          {cfg.conductorType === "acsr" && (
            <>
            <div>
              <label className={labelCls}>GMR Ds (manufacturer)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="any"
                  min={0}
                  value={cfg.acsrDs / dsFactor}
                  onChange={(e) =>
                    update({ acsrDs: parseFloat(e.target.value) * dsFactor })
                  }
                  className={inputCls}
                />
                <select
                  value={dsUnit}
                  onChange={(e) => setDsUnit(e.target.value)}
                  className="rounded-lg border border-input bg-background px-2 text-sm"
                  aria-label="GMR unit"
                >
                  {RADIUS_UNITS.map((u) => (
                    <option key={u.label}>{u.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <label className="col-span-2 flex cursor-default items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={cfg.acsrUseSolid}
                onChange={(e) => update({ acsrUseSolid: e.target.checked })}
                className="size-4 accent-[var(--color-primary)]"
              />
              Use r' = e<sup>−1/4</sup>·r = 0.7788·r instead of the table GMR
            </label>
            </>
          )}
          {cfg.conductorType === "bundled" && (
            <>
              <div>
                <label className={labelCls}>Sub-conductors</label>
                <select
                  value={cfg.subconductors}
                  onChange={(e) => {
                    const n = Number(e.target.value) as SubConductorCount;
                    const patch: Partial<LineConfig> = { subconductors: n };
                    if (n === 4 && cfg.bundleArrangement === "triangle")
                      patch.bundleArrangement = "square";
                    if (n === 3 && cfg.bundleArrangement === "square")
                      patch.bundleArrangement = "triangle";
                    update(patch);
                  }}
                  className={inputCls}
                >
                  {[2, 3, 4].map((s) => (
                    <option key={s} value={s}>
                      {s}-conductor bundle
                    </option>
                  ))}
                </select>
              </div>
              {cfg.subconductors >= 3 && (
                <div className="col-span-2">
                  <label className={labelCls}>Sub-conductor arrangement</label>
                  <Segmented
                    options={
                      cfg.subconductors === 3
                        ? [
                            { label: "Equilateral triangle", value: "triangle" as const },
                            { label: "In a line", value: "line" as const },
                          ]
                        : [
                            { label: "Square", value: "square" as const },
                            { label: "In a line", value: "line" as const },
                          ]
                    }
                    value={
                      cfg.bundleArrangement === "triangle" && cfg.subconductors === 4
                        ? "square"
                        : cfg.bundleArrangement === "square" && cfg.subconductors === 3
                          ? "triangle"
                          : cfg.bundleArrangement
                    }
                    onChange={(v) => update({ bundleArrangement: v })}
                  />
                </div>
              )}
              <div>
                <label className={labelCls}>GMR Ds (per sub-conductor)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="any"
                    min={0}
                    value={cfg.bundleDs / dsFactor}
                    onChange={(e) =>
                      update({ bundleDs: parseFloat(e.target.value) * dsFactor })
                    }
                    className={inputCls}
                  />
                  <select
                    value={dsUnit}
                    onChange={(e) => setDsUnit(e.target.value)}
                    className="rounded-lg border border-input bg-background px-2 text-sm"
                    aria-label="Bundle GMR unit"
                  >
                    {RADIUS_UNITS.map((u) => (
                      <option key={u.label}>{u.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <UnitField
                label="Bundle spacing d (between adjacent)"
                value={cfg.bundleSpacing}
                onChange={(v) => update({ bundleSpacing: v })}
                unit={bsUnit}
                onUnitChange={setBsUnit}
                step="0.01"
              />
              <label className="col-span-2 flex cursor-default items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={cfg.bundleUseSolid}
                  onChange={(e) => update({ bundleUseSolid: e.target.checked })}
                  className="size-4 accent-[var(--color-primary)]"
                />
                Use r' = e<sup>−1/4</sup>·r = 0.7788·r instead of the table GMR
              </label>
            </>
          )}
          <div>
            <label className={labelCls}>Frequency</label>
            <Segmented
              options={[
                { label: "50 Hz", value: 50 },
                { label: "60 Hz", value: 60 },
              ]}
              value={cfg.freq}
              onChange={(v) => update({ freq: v })}
            />
          </div>
          <NumField
            label="Line length"
            value={cfg.lengthKm}
            onChange={(v) => update({ lengthKm: v })}
            suffix="km"
          />
          <NumField
            label="Line-to-line voltage"
            value={cfg.voltageKV}
            onChange={(v) => update({ voltageKV: v })}
            suffix="kV"
          />
        </div>
      </section>

      {/* Geometry */}
      <section>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Geometry
        </h4>
        {cfg.system === "three" && cfg.circuit === "single" && (
          <div className="mb-3">
            <Segmented
              options={[
                { label: "Equilateral", value: "equilateral" },
                { label: "Horizontal", value: "horizontal" },
                { label: "Asymmetric distances", value: "asymmetric" },
                { label: "Custom (x, y)", value: "custom" },
              ]}
              value={cfg.layout}
              onChange={(v) => update({ layout: v })}
            />
          </div>
        )}
        {cfg.system === "three" && cfg.circuit === "double" && (
          <div className="mb-3">
            <Segmented
              options={[
                { label: "Vertical (2 columns)", value: "vertical" },
                { label: "Hexagonal", value: "hexagonal" },
                { label: "Delta", value: "delta" },
                { label: "Custom (x, y)", value: "custom" },
              ]}
              value={cfg.doublePreset}
              onChange={(v) => update({ doublePreset: v })}
            />
          </div>
        )}
        {!isCustom && cfg.circuit === "single" && (
          <div className="grid grid-cols-2 gap-3">
            <UnitField
              label={
                cfg.system === "three" && cfg.layout === "equilateral"
                  ? "Equilateral spacing D"
                  : "Adjacent spacing D"
              }
              value={cfg.spacingD}
              onChange={(v) => update({ spacingD: v })}
              unit={dUnit}
              onUnitChange={setDUnit}
            />
            <UnitField
              label="Height above ground"
              value={cfg.heightM}
              onChange={(v) => update({ heightM: v })}
              unit={hUnit}
              onUnitChange={setHUnit}
            />
          </div>
        )}
        {cfg.system === "three" && cfg.circuit === "single" && cfg.layout === "asymmetric" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <UnitField
                label="Distance A–B"
                value={cfg.phaseDistances.ab}
                onChange={(ab) => update({ phaseDistances: { ...cfg.phaseDistances, ab } })}
                unit={dUnit}
                onUnitChange={setDUnit}
              />
              <UnitField
                label="Distance B–C"
                value={cfg.phaseDistances.bc}
                onChange={(bc) => update({ phaseDistances: { ...cfg.phaseDistances, bc } })}
                unit={dUnit}
                onUnitChange={setDUnit}
              />
              <UnitField
                label="Distance C–A"
                value={cfg.phaseDistances.ca}
                onChange={(ca) => update({ phaseDistances: { ...cfg.phaseDistances, ca } })}
                unit={dUnit}
                onUnitChange={setDUnit}
              />
            </div>
            {!isValidAsymmetricTriangle(cfg) && (
              <p role="alert" className="text-xs text-destructive">
                Enter three positive distances that can form a triangle: the sum of any two must exceed the third.
              </p>
            )}
            <UnitField
              label="Height above ground"
              value={cfg.heightM}
              onChange={(v) => update({ heightM: v })}
              unit={hUnit}
              onUnitChange={setHUnit}
            />
          </div>
        )}
        {(isCustom || cfg.circuit === "double") && (
          <div>
            <div className="mb-2 flex items-center justify-end gap-2">
              <span className="text-xs text-muted-foreground">
                Enter x, y in
              </span>
              <UnitSelect
                value={coordUnit}
                onChange={setCoordUnit}
                ariaLabel="Coordinate unit"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-secondary/40 p-3 sm:grid-cols-3">
              {labels.map((lab, i) => (
                <div key={lab} className="rounded-lg bg-card p-2 shadow-sm">
                  <div className="mb-1 font-mono text-xs font-semibold text-primary">
                    {lab}
                  </div>
                  <div className="flex gap-1">
                    <input
                      type="number"
                      step="any"
                      value={
                        Number.isFinite(coords[i]!.x)
                          ? parseFloat((coords[i]!.x / coordFactor).toPrecision(6))
                          : ""
                      }
                      onChange={(e) =>
                        setCoord(i, "x", parseFloat(e.target.value) * coordFactor)
                      }
                      className="w-full rounded-md border border-input bg-background px-1.5 py-1 text-xs font-mono"
                      aria-label={`x of ${lab}`}
                      placeholder="x"
                    />
                    <input
                      type="number"
                      step="any"
                      value={
                        Number.isFinite(coords[i]!.y)
                          ? parseFloat((coords[i]!.y / coordFactor).toPrecision(6))
                          : ""
                      }
                      onChange={(e) =>
                        setCoord(i, "y", parseFloat(e.target.value) * coordFactor)
                      }
                      className="w-full rounded-md border border-input bg-background px-1.5 py-1 text-xs font-mono"
                      aria-label={`y of ${lab}`}
                      placeholder="y"
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Tip: you can also drag the dots in the configuration diagram to set
              each conductor's position — no typing needed.
            </p>
          </div>
        )}
        {cfg.system === "three" && (
          <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={cfg.earthEffect}
              onChange={(e) => update({ earthEffect: e.target.checked })}
              className="size-4 accent-[var(--color-primary)]"
            />
            <span className="flex items-center gap-1">
              Include earth effect on capacitance
              <ChevronDown className="size-3 text-muted-foreground" aria-hidden />
            </span>
          </label>
        )}
      </section>
    </div>
  );
}
