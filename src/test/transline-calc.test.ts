import { describe, expect, it } from "vitest";
import { computeLine } from "@/lib/transline/calc";
import { defaultConfig, selfCheckConfig, buildCoords } from "@/lib/transline/config";
import { STRAND_FACTOR, SOLID_FACTOR } from "@/lib/transline/constants";

describe("self-check example (Grainger & Stevenson)", () => {
  const res = computeLine(selfCheckConfig());

  it("computes Deq = 6.3 m for horizontal spacing 5 m", () => {
    expect(res.deq).toBeCloseTo(6.3, 2);
  });

  it("computes Ds = 0.7788 cm for a solid conductor", () => {
    expect(res.gmrInd).toBeCloseTo(0.7788e-2, 6);
  });

  it("reproduces L ≈ 1.339 mH/km", () => {
    const lMhKm = res.lPrim * 1e6;
    expect(Math.abs(lMhKm - 1.339)).toBeLessThan(0.005);
  });

  it("reproduces C ≈ 8.63 nF/km", () => {
    const cnNfKm = res.cn * 1e12;
    expect(Math.abs(cnNfKm - 8.63)).toBeLessThan(0.05);
  });

  it("uses r (not 0.7788 r) as the capacitance GMR", () => {
    expect(res.gmrCap).toBe(0.01);
    expect(res.dsEqCap).toBeCloseTo(0.01, 12);
  });
});

describe("GMR table factors", () => {
  it("solid round factor is e^(-1/4)", () => {
    expect(SOLID_FACTOR).toBeCloseTo(0.7788, 4);
  });

  it("strand factors match the table", () => {
    expect(STRAND_FACTOR[7]).toBe(0.726);
    expect(STRAND_FACTOR[19]).toBe(0.758);
    expect(STRAND_FACTOR[37]).toBe(0.768);
    expect(STRAND_FACTOR[61]).toBe(0.772);
    expect(STRAND_FACTOR[91]).toBe(0.774);
  });
});

describe("single-phase two-wire line", () => {
  const cfg: Parameters<typeof computeLine>[0] = {
    ...defaultConfig(),
    system: "single",
    circuit: "single",
    conductorType: "solid",
    radius: 0.01,
    spacingD: 3,
  };
  const res = computeLine(cfg);

  it("loop inductance is 4e-7 ln(D/Ds) and twice the per-conductor value", () => {
    const expected = 4e-7 * Math.log(3 / (SOLID_FACTOR * 0.01));
    expect(res.lLoop!).toBeCloseTo(expected, 12);
    expect(res.lLoop!).toBeCloseTo(2 * res.lX!, 15);
  });

  it("line-to-neutral capacitance is twice line-to-line", () => {
    expect(res.cn).toBeCloseTo(2 * res.cAb!, 18);
    expect(res.cn).toBeCloseTo(2 * Math.PI * 8.854e-12 / Math.log(3 / 0.01), 15);
  });
});

describe("three-phase double circuit (vertical preset)", () => {
  const cfg: Parameters<typeof computeLine>[0] = {
    ...defaultConfig(),
    system: "three",
    circuit: "double",
    conductorType: "solid",
    radius: 0.01,
  };
  const res = computeLine(cfg);

  it("groups each phase as a pair and computes a finite GMD", () => {
    expect(res.groups).toEqual([[0, 1], [2, 3], [4, 5]]);
    expect(res.deq).toBeGreaterThan(0);
    expect(res.groupGmrInd.every((g) => g > res.dsEqInd / 1.01 && g < res.dsEqInd * 1.01)).toBe(true);
  });

  it("double-circuit inductance is lower than an equivalent single circuit", () => {
    const single = computeLine(selfCheckConfig());
    expect(res.lPrim).toBeLessThan(single.lPrim);
  });

  it("preset coordinates are 6 positions with positive heights", () => {
    const coords = buildCoords(cfg);
    expect(coords).toHaveLength(6);
    expect(coords.every((c) => c.y > 0)).toBe(true);
  });
});

describe("bundled conductor GMR source", () => {
  const base = {
    ...defaultConfig(),
    conductorType: "bundled" as const,
    radius: 0.02,
    bundleSpacing: 0.4572,
    subconductors: 2 as const,
  };

  it("uses r' = 0.7788 r per sub-conductor when the checkbox is on", () => {
    const res = computeLine({ ...base, bundleUseSolid: true });
    expect(res.gmrInd).toBeCloseTo(Math.sqrt(SOLID_FACTOR * base.radius * base.bundleSpacing), 12);
  });

  it("uses the entered table GMR when the checkbox is off", () => {
    const res = computeLine({ ...base, bundleDs: 0.0159, bundleUseSolid: false });
    expect(res.gmrInd).toBeCloseTo(Math.sqrt(0.0159 * base.bundleSpacing), 12);
  });

  it("requires a table GMR when the checkbox is off", () => {
    const res = computeLine({ ...base, bundleDs: 0, bundleUseSolid: false });
    expect(res.errors).toContainEqual(expect.stringContaining("GMR"));
  });
});

describe("bundled 3 sub-conductors in a straight line (reference problem)", () => {
  // Phases 8 m apart horizontally; 3 sub-conductors per phase in a line,
  // adjacent spacing d = 0.2 m; r' = 0.0289 ft = 8.81e-3 m → r = r'/0.7788.
  const rPrime = 0.0289 * 0.3048;
  const cfg = {
    ...defaultConfig(),
    conductorType: "bundled" as const,
    subconductors: 3 as const,
    bundleArrangement: "line" as const,
    bundleUseSolid: true,
    radius: rPrime / SOLID_FACTOR,
    bundleSpacing: 0.2,
    layout: "horizontal" as const,
    spacingD: 8,
  };
  const res = computeLine(cfg);

  it("bundle GMR = ⁹√((Ds·d·2d)(d·Ds·d)(2d·d·Ds)) ≈ 0.0824 m", () => {
    expect(res.gmrInd).toBeCloseTo(0.0824, 3);
  });

  it("an equilateral-triangle bundle keeps ∛(Ds·d²) instead", () => {
    const tri = computeLine({ ...cfg, bundleArrangement: "triangle" });
    expect(tri.gmrInd).toBeCloseTo(
      Math.cbrt(rPrime * 0.2 * 0.2),
      12,
    );
  });

  it("GMD = ∛(8·8·16) ≈ 10.08 m and L ≈ 9.61e-7 H/m", () => {
    expect(res.deq).toBeCloseTo(10.08, 2);
    expect(res.lPrim).toBeCloseTo(9.61e-7, 8);
  });
});

describe("3-phase double circuit, two flat rows (reference problem)", () => {
  // Top row a, b, c 8 m apart at 13 m; bottom row a', b', c' 3 m below.
  const cfg = {
    ...defaultConfig(),
    system: "three" as const,
    circuit: "double" as const,
    conductorType: "solid" as const,
    radius: 0.01,
    doublePreset: "custom" as const,
    // Label order is a, a', b, b', c, c': each phase pair sits 3 m apart vertically.
    coords: [
      { x: 0, y: 13 },
      { x: 0, y: 10 },
      { x: 8, y: 13 },
      { x: 8, y: 10 },
      { x: 16, y: 13 },
      { x: 16, y: 10 },
    ],
  };
  const res = computeLine(cfg);

  it("keeps the phase groups a–a', b–b', c–c' by label, not by position", () => {
    expect(res.groups).toEqual([[0, 1], [2, 3], [4, 5]]);
  });

  it("reproduces DsA ≈ 0.1528 m, Deq ≈ 10.33 m, L ≈ 8.43e-4 mH/km", () => {
    expect(res.groupGmrInd[0]).toBeCloseTo(0.1528, 3);
    expect(res.deq).toBeCloseTo(10.33, 2);
    expect(res.lPrim * 1e6).toBeCloseTo(0.8427, 3);
  });
});
