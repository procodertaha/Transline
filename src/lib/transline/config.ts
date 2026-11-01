import type { CircuitType, LineConfig, SystemType, Vec2 } from "./types";

export const MU0 = 4 * Math.PI * 1e-7; // H/m
export const EPS0 = 8.854e-12; // F/m
export const SOLID_FACTOR = Math.exp(-0.25); // 0.7788
export const MILE = 1609.344; // m

export const STRAND_FACTOR: Record<number, number> = {
  7: 0.726,
  19: 0.758,
  37: 0.768,
  61: 0.772,
  91: 0.774,
};

export function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function labelsFor(system: SystemType, circuit: CircuitType): string[] {
  if (system === "single") {
    return circuit === "single" ? ["a", "b"] : ["a", "a'", "b", "b'"];
  }
  return circuit === "single"
    ? ["a", "b", "c"]
    : ["a", "a'", "b", "b'", "c", "c'"];
}

/** Phase/side groups as arrays of conductor indices. */
export function groupsFor(system: SystemType, circuit: CircuitType): number[][] {
  if (system === "single") {
    return circuit === "single" ? [[0], [1]] : [[0, 1], [2, 3]];
  }
  return circuit === "single" ? [[0], [1], [2]] : [[0, 1], [2, 3], [4, 5]];
}

export function defaultConfig(): LineConfig {
  return {
    system: "three",
    circuit: "single",
    conductorType: "solid",
    strands: 7,
    acsrDs: 0.01,
    acsrUseSolid: false,
    bundleDs: 0.01,
    bundleUseSolid: false,
    subconductors: 2,
    bundleArrangement: "line",
    bundleSpacing: 0.4572,
    radius: 0.01,
    freq: 50,
    lengthKm: 100,
    voltageKV: 220,
    layout: "horizontal",
    doublePreset: "vertical",
    spacingD: 5,
    heightM: 10,
    coords: [],
    earthEffect: false,
  };
}

/** Coordinates for preset layouts (metres, y = height above ground). */
export function buildCoords(cfg: LineConfig): Vec2[] {
  const D = cfg.spacingD;
  const H = cfg.heightM;
  if (cfg.system === "single") {
    if (cfg.circuit === "single") {
      return [
        { x: 0, y: H },
        { x: D, y: H },
      ];
    }
    // double circuit: side x = {a, a'} vertical, side y = {b, b'}
    if (cfg.doublePreset === "custom") return cfg.coords;
    return [
      { x: 0, y: 8 },
      { x: 0, y: 4 },
      { x: D, y: 8 },
      { x: D, y: 4 },
    ];
  }
  if (cfg.circuit === "single") {
    switch (cfg.layout) {
      case "equilateral":
        return [
          { x: 0, y: H + (Math.sqrt(3) / 2) * D },
          { x: -D / 2, y: H },
          { x: D / 2, y: H },
        ];
      case "horizontal":
        return [
          { x: 0, y: H },
          { x: D, y: H },
          { x: 2 * D, y: H },
        ];
      default:
        return cfg.coords;
    }
  }
  switch (cfg.doublePreset) {
    case "vertical":
      return [
        { x: 0, y: 9 },
        { x: 5, y: 9 },
        { x: 0, y: 5 },
        { x: 5, y: 5 },
        { x: 0, y: 1 },
        { x: 5, y: 1 },
      ];
    case "hexagonal": {
      const r = 5;
      const c = { x: 4.33, y: 5.5 };
      return [
        { x: c.x, y: c.y + r },
        { x: c.x, y: c.y - r },
        { x: c.x + (Math.sqrt(3) / 2) * r, y: c.y + r / 2 },
        { x: c.x - (Math.sqrt(3) / 2) * r, y: c.y - r / 2 },
        { x: c.x + (Math.sqrt(3) / 2) * r, y: c.y - r / 2 },
        { x: c.x - (Math.sqrt(3) / 2) * r, y: c.y + r / 2 },
      ];
    }
    case "delta":
      return [
        { x: -5, y: 6 },
        { x: 5, y: 6 },
        { x: -7.5, y: 2 },
        { x: 2.5, y: 2 },
        { x: -2.5, y: 2 },
        { x: 7.5, y: 2 },
      ];
    default:
      return cfg.coords;
  }
}

/** True when the current config is the built-in self-check example. */
export function isSelfCheck(cfg: LineConfig): boolean {
  return (
    cfg.system === "three" &&
    cfg.circuit === "single" &&
    cfg.conductorType === "solid" &&
    Math.abs(cfg.radius - 0.01) < 1e-9 &&
    cfg.layout === "horizontal" &&
    Math.abs(cfg.spacingD - 5) < 1e-9 &&
    cfg.freq === 50
  );
}

export function selfCheckConfig(): LineConfig {
  return {
    ...defaultConfig(),
    system: "three",
    circuit: "single",
    conductorType: "solid",
    radius: 0.01,
    layout: "horizontal",
    spacingD: 5,
    freq: 50,
  };
}
