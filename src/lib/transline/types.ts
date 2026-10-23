export type SystemType = "single" | "three";
export type CircuitType = "single" | "double";
export type ConductorType =
  | "solid"
  | "stranded"
  | "acsr"
  | "hollow"
  | "bundled";
export type StrandCount = 7 | 19 | 37 | 61 | 91;
export type SubConductorCount = 2 | 3 | 4;
export type DoublePreset = "vertical" | "hexagonal" | "delta" | "custom";

export interface Vec2 {
  x: number;
  y: number;
}

export interface ConductorSpec {
  type: ConductorType;
  strands?: StrandCount;
  /** User-entered GMR for inductance, in metres (ACSR from manufacturer table). */
  acsrDs?: number;
  subconductors?: SubConductorCount;
  /** Bundle spacing d, in metres. */
  bundleSpacing?: number;
}

export interface LineConfig {
  system: SystemType;
  circuit: CircuitType;
  conductorType: ConductorType;
  strands: StrandCount;
  acsrDs: number; // metres
  subconductors: SubConductorCount;
  bundleSpacing: number; // metres
  radius: number; // metres (outer radius of whole conductor)
  freq: 50 | 60;
  lengthKm: number;
  voltageKV: number; // line-to-line
  layout: "equilateral" | "horizontal" | "custom";
  doublePreset: DoublePreset;
  spacingD: number; // metres
  heightM: number; // metres above ground (presets)
  coords: Vec2[]; // used when layout/preset is "custom"
  earthEffect: boolean;
}

/** Unit conversion factors to metres. */
export const RADIUS_UNITS: { label: string; factor: number }[] = [
  { label: "mm", factor: 0.001 },
  { label: "cm", factor: 0.01 },
  { label: "m", factor: 1 },
  { label: "in", factor: 0.0254 },
  { label: "ft", factor: 0.3048 },
];
