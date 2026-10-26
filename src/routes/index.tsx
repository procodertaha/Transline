import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, CircleCheck, Zap } from "lucide-react";
import { computeLine } from "@/lib/transline/calc";
import {
  buildCoords,
  defaultConfig,
  labelsFor,
  selfCheckConfig,
} from "@/lib/transline/config";
import { formulaCards } from "@/lib/transline/formulas";
import type { ConductorType, LineConfig } from "@/lib/transline/types";
import { InputPanel } from "@/components/transline/InputPanel";
import { ResultsPanel } from "@/components/transline/ResultsPanel";
import { ConductorDiagram } from "@/components/transline/ConductorDiagram";
import { TeX } from "@/components/transline/TeX";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title: "TransLine Calculator — Line Inductance & Capacitance",
      },
      {
        name: "description",
        content:
          "Compute transmission line inductance and capacitance step by step: single/three-phase, single/double circuit, stranded, ACSR, hollow and bundled conductors.",
      },
      { property: "og:title", content: "TransLine Calculator — Line Inductance & Capacitance" },
      {
        property: "og:description",
        content:
          "Step-by-step transmission line parameter calculator with KaTeX formulas, worked solutions and diagrams.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function OptionCard({
  selected,
  title,
  desc,
  onClick,
}: {
  selected: boolean;
  title: string;
  desc?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border p-4 text-left transition",
        selected
          ? "border-primary bg-primary/5 ring-2 ring-primary/30"
          : "border-border bg-card hover:border-primary/40 hover:bg-accent/50",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">{title}</span>
        <span
          className={cn(
            "flex size-4.5 shrink-0 items-center justify-center rounded-full border",
            selected ? "border-primary bg-primary text-primary-foreground" : "border-border",
          )}
        >
          {selected && <CircleCheck className="size-3" />}
        </span>
      </div>
      {desc && <p className="mt-1 text-xs text-muted-foreground">{desc}</p>}
    </button>
  );
}

function StepHeading({
  n,
  title,
  hint,
}: {
  n: number;
  title: string;
  hint?: string;
}) {
  return (
    <div id={`step-${n}`} className="scroll-mt-24">
      <div className="flex items-center gap-2">
        <span className="flex size-6 items-center justify-center rounded-full bg-primary font-mono text-xs font-bold text-primary-foreground">
          {n}
        </span>
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      </div>
      {hint && <p className="mt-1 ml-8 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

const CONDUCTOR_OPTIONS: { type: ConductorType; title: string; desc: string }[] = [
  { type: "solid", title: "Solid round", desc: "Ds = r' = e⁻¹ᐟ⁴·r = 0.7788 r" },
  { type: "stranded", title: "Stranded", desc: "7 / 19 / 37 / 61 / 91 strands — table factors" },
  { type: "acsr", title: "ACSR / composite", desc: "Enter GMR (Ds) from the manufacturer table" },
  { type: "hollow", title: "Hollow / tubular", desc: "Thin-walled tube — Ds ≈ r" },
  { type: "bundled", title: "Bundled", desc: "2, 3 or 4 sub-conductors per phase" },
];

function Index() {
  const [cfg, setCfg] = useState<LineConfig>(defaultConfig);
  const [tab, setTab] = useState<"ind" | "cap">("ind");
  const res = useMemo(() => computeLine(cfg), [cfg]);

  const update = (patch: Partial<LineConfig>) => {
    setCfg((prev) => {
      const next: LineConfig = { ...prev, ...patch };
      if (
        (patch.system && patch.system !== prev.system) ||
        (patch.circuit && patch.circuit !== prev.circuit)
      ) {
        next.layout = "horizontal";
        next.doublePreset = "vertical";
        next.coords = [];
        return next;
      }
      const toCustom = patch.layout === "custom" || patch.doublePreset === "custom";
      if (toCustom) {
        if (prev.coords.length === 0) {
          next.coords = buildCoords({
            ...prev,
            ...patch,
            layout: patch.layout === "custom" ? prev.layout : next.layout,
            doublePreset:
              patch.doublePreset === "custom" ? prev.doublePreset : next.doublePreset,
          });
        }
      } else if (patch.layout !== undefined || patch.doublePreset !== undefined) {
        next.coords = [];
      }
      return next;
    });
  };

  const cards = formulaCards(cfg, tab);
  const labels = labelsFor(cfg.system, cfg.circuit);
  const coords = buildCoords(cfg);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16">
      {/* Hero */}
      <section className="grid-bg -mx-4 mb-8 border-b border-border bg-secondary/30 px-4 py-8">
        <div className="max-w-2xl">
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
            <Zap className="size-6 text-primary" />
            Transmission Line Parameters
          </h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Compute inductance and capacitance per phase for any configuration —
            with the correct formulas, a step-by-step worked solution and a live
            diagram, all in your browser.
          </p>
        </div>
      </section>

      {/* Stepper */}
      <nav className="mb-8 flex flex-wrap gap-2">
        {["System", "Circuit", "Conductor", "Calculate"].map((label, i) => (
          <a
            key={label}
            href={`#step-${i + 1}`}
            className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium transition hover:border-primary/50 hover:bg-accent"
          >
            <span className="font-mono text-primary">{i + 1}</span>
            {label}
            <ChevronRight className="size-3 text-muted-foreground" />
          </a>
        ))}
      </nav>

      <div className="space-y-10">
        <section>
          <StepHeading n={1} title="Choose the system type" />
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:max-w-2xl">
            <OptionCard
              selected={cfg.system === "single"}
              title="Single-phase"
              desc="Two-wire line: loop inductance, line-to-line and line-to-neutral capacitance."
              onClick={() => update({ system: "single" })}
            />
            <OptionCard
              selected={cfg.system === "three"}
              title="Three-phase"
              desc="Per-phase parameters with complete transposition (Deq = GMD)."
              onClick={() => update({ system: "three" })}
            />
          </div>
        </section>

        <section>
          <StepHeading n={2} title="Choose the circuit type" />
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:max-w-2xl">
            <OptionCard
              selected={cfg.circuit === "single"}
              title="Single circuit"
              desc="One three-phase (or two-wire) circuit."
              onClick={() => update({ circuit: "single" })}
            />
            <OptionCard
              selected={cfg.circuit === "double"}
              title="Double circuit"
              desc="Two parallel circuits on the same towers — lower reactance, higher stability limit."
              onClick={() => update({ circuit: "double" })}
            />
          </div>
        </section>

        <section>
          <StepHeading n={3} title="Choose the conductor type" />
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CONDUCTOR_OPTIONS.map((o) => (
              <OptionCard
                key={o.type}
                selected={cfg.conductorType === o.type}
                title={o.title}
                desc={o.desc}
                onClick={() => update({ conductorType: o.type })}
              />
            ))}
          </div>
          {cfg.conductorType === "stranded" && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">Stranding:</span>
              {([7, 19, 37, 61, 91] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => update({ strands: s })}
                  className={cn(
                    "rounded-full border px-3 py-1 font-mono text-xs transition",
                    cfg.strands === s
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card hover:bg-accent",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </section>

        <section>
          <StepHeading
            n={4}
            title="Formulas, inputs and worked solution"
            hint="Switch between the inductance and capacitance calculations — both share the geometry inputs."
          />
          <div className="mt-4 mb-5 flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg bg-secondary p-1">
              <button
                type="button"
                onClick={() => setTab("ind")}
                className={cn(
                  "rounded-md px-4 py-1.5 text-sm font-medium transition",
                  tab === "ind"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Inductance
              </button>
              <button
                type="button"
                onClick={() => setTab("cap")}
                className={cn(
                  "rounded-md px-4 py-1.5 text-sm font-medium transition",
                  tab === "cap"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Capacitance
              </button>
            </div>
            <button
              type="button"
              onClick={() => setCfg(selfCheckConfig())}
              className="rounded-lg border border-primary/40 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/10"
            >
              Load built-in self-check example
            </button>
            <Link
              to="/stability"
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium transition hover:bg-accent"
            >
              Use these results in the stability module →
            </Link>
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(340px,420px)_1fr]">
            <div className="space-y-5">
              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold">
                  Formulas for this combination
                </h3>
                <div className="space-y-3">
                  {cards.map((c, i) => (
                    <div key={i} className="rounded-xl bg-secondary/50 p-3">
                      <div className="text-xs font-semibold text-primary">{c.title}</div>
                      <TeX math={c.tex} block className="mt-1.5 text-[0.95rem]" />
                      {c.note && (
                        <p className="mt-1.5 text-xs text-muted-foreground">{c.note}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold">Inputs</h3>
                <InputPanel cfg={cfg} update={update} />
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold">Configuration diagram</h3>
                <ConductorDiagram coords={coords} labels={labels} groups={res.groups} />
                <p className="mt-2 text-xs text-muted-foreground">
                  Conductor positions in metres (y = height above ground). Dashed
                  links mark conductors of the same phase.
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold">
                  Results{tab === "ind" ? " — inductance" : " — capacitance"}
                </h3>
                <ResultsPanel cfg={cfg} res={res} tab={tab} />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
