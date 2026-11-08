import { describe, expect, it } from "vitest";
import {
  calculateAllPerformanceModels,
  calculatePerformance,
  validatePerformanceInput,
  type PerformanceInput,
} from "@/lib/transline/performance";

const sample: PerformanceInput = {
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

describe("line performance models", () => {
  it("uses the exact short-line ABCD constants", () => {
    const result = calculatePerformance(sample, "short");
    expect(result.abcd.A).toEqual({ re: 1, im: 0 });
    expect(result.abcd.D).toEqual({ re: 1, im: 0 });
    expect(result.abcd.C).toEqual({ re: 0, im: 0 });
    expect(result.abcd.B).toEqual(result.zTotal);
    expect(result.abcdDeterminant).toEqual({ re: 1, im: 0 });
  });

  it("computes finite results for the uploaded 100 km class example", () => {
    const result = calculatePerformance(sample, "nominal-pi");
    expect(result.sendingVoltageKv).toBeGreaterThan(110);
    expect(result.sendingCurrentA).toBeGreaterThan(0);
    expect(result.sendingPowerMw).toBeGreaterThan(20);
    expect(result.efficiencyPercent).toBeGreaterThan(0);
    expect(result.efficiencyPercent).toBeLessThan(100);
    expect(result.noLoadChargingCurrentA).toBeGreaterThan(0);
    expect(result.abcdDeterminant.re).toBeCloseTo(1, 9);
    expect(result.abcdDeterminant.im).toBeCloseTo(0, 9);
  });

  it("produces four comparable model results and includes long-line equivalent pi", () => {
    const results = calculateAllPerformanceModels(sample);
    expect(results.map((result) => result.model)).toEqual(["short", "nominal-pi", "nominal-t", "long"]);
    expect(results.every((result) => Number.isFinite(result.sendingPowerMw))).toBe(true);
    expect(results[3]?.equivalentPi?.seriesImpedance).toBeDefined();
    expect(results[3]?.equivalentPi?.shuntAdmittanceHalf).toBeDefined();
  });

  it("rejects non-positive line values and out-of-range power factor", () => {
    expect(validatePerformanceInput({ ...sample, lengthKm: 0 })).toContain("Line length must be a positive number.");
    expect(validatePerformanceInput({ ...sample, powerFactor: 1.1 })).toContain("Power factor must be greater than 0 and no greater than 1.");
  });
});