import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { buildCoords, labelsFor } from "@/lib/transline/config";
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
}: {
  cfg: LineConfig;
  update: (patch: Partial<LineConfig>) => void;
}) {
  const [rUnit, setRUnit] = useState("cm");
  const [dsUnit, setDsUnit] = useState("m");
  const rFactor = RADIUS_UNITS.find((u) => u.label === rUnit)!.factor;
  const dsFactor = RADIUS_UNITS.find((u) => u.label === dsUnit)!.factor;
  const labels = labelsFor(cfg.system, cfg.circuit);
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
                    {s}-strand (Ds = {(0.726 + [7, 19, 37, 61, 91].indexOf(s) * 0.012).toFixed(3)}·r)
                  </option>
                ))}
              </select>
            </div>
          )}
          {cfg.conductorType === "acsr" && (
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
          )}
          {cfg.conductorType === "bundled" && (
            <>
              <div>
                <label className={labelCls}>Sub-conductors</label>
                <select
                  value={cfg.subconductors}
                  onChange={(e) =>
                    update({
                      subconductors: Number(e.target.value) as SubConductorCount,
                    })
                  }
                  className={inputCls}
                >
                  {[2, 3, 4].map((s) => (
                    <option key={s} value={s}>
                      {s}-conductor bundle
                    </option>
                  ))}
                </select>
              </div>
              <NumField
                label="Bundle spacing d"
                value={cfg.bundleSpacing}
                onChange={(v) => update({ bundleSpacing: v })}
                step="0.01"
                suffix="m"
              />
            </>
          )}
          <NumField
            label="Frequency f"
            value={cfg.freq}
            onChange={(v) =>
              update({ freq: v === 60 ? 60 : 50 })
            }
            suffix="Hz"
          />
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
            <NumField
              label={
                cfg.system === "three" && cfg.layout === "equilateral"
                  ? "Equilateral spacing D"
                  : "Adjacent spacing D"
              }
              value={cfg.spacingD}
              onChange={(v) => update({ spacingD: v })}
              step="0.1"
              suffix="m"
            />
            <NumField
              label="Height above ground"
              value={cfg.heightM}
              onChange={(v) => update({ heightM: v })}
              step="0.1"
              suffix="m"
            />
          </div>
        )}
        {(isCustom || cfg.circuit === "double") && (
          <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-secondary/40 p-3 sm:grid-cols-3">
            {labels.map((lab, i) => (
              <div key={lab} className="rounded-lg bg-card p-2 shadow-sm">
                <div className="mb-1 font-mono text-xs font-semibold text-primary">
                  {lab}
                </div>
                <div className="flex gap-1">
                  <input
                    type="number"
                    step="0.1"
                    value={coords[i].x}
                    onChange={(e) => setCoord(i, "x", parseFloat(e.target.value))}
                    className="w-full rounded-md border border-input bg-background px-1.5 py-1 text-xs font-mono"
                    aria-label={`x of ${lab}`}
                    placeholder="x"
                  />
                  <input
                    type="number"
                    step="0.1"
                    value={coords[i].y}
                    onChange={(e) => setCoord(i, "y", parseFloat(e.target.value))}
                    className="w-full rounded-md border border-input bg-background px-1.5 py-1 text-xs font-mono"
                    aria-label={`y of ${lab}`}
                    placeholder="y"
                  />
                </div>
              </div>
            ))}
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
