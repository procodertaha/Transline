export type Complex = { re: number; im: number };
export type PerformanceModel = "short" | "nominal-pi" | "nominal-t" | "long";
export type PowerFactorMode = "lagging" | "leading" | "unity";

export interface PerformanceInput {
  lengthKm: number;
  resistanceOhmKm: number;
  inductanceMhKm: number;
  capacitanceNfKm: number;
  frequencyHz: 50 | 60;
  receivingVoltageKv: number;
  receivingPowerMw: number;
  powerFactor: number;
  powerFactorMode: PowerFactorMode;
}

export interface AbcdConstants {
  A: Complex;
  B: Complex;
  C: Complex;
  D: Complex;
}

export interface PerformanceResult {
  model: PerformanceModel;
  abcd: AbcdConstants;
  zTotal: Complex;
  yTotal: Complex;
  receivingVoltagePhase: Complex;
  receivingCurrent: Complex;
  sendingVoltagePhase: Complex;
  sendingCurrent: Complex;
  sendingVoltageKv: number;
  sendingVoltageAngleDeg: number;
  sendingCurrentA: number;
  sendingCurrentAngleDeg: number;
  sendingPowerMw: number;
  sendingReactivePowerMvar: number;
  sendingPowerFactor: number;
  powerLossMw: number;
  efficiencyPercent: number;
  regulationPercent: number;
  noLoadReceivingVoltagePhase: Complex;
  noLoadChargingCurrentA: number;
  ferrantiRisePercent: number;
  abcdDeterminant: Complex;
}

const c = (re = 0, im = 0): Complex => ({ re, im });
const add = (a: Complex, b: Complex): Complex => c(a.re + b.re, a.im + b.im);
const sub = (a: Complex, b: Complex): Complex => c(a.re - b.re, a.im - b.im);
const mul = (a: Complex, b: Complex): Complex =>
  c(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
const scale = (a: Complex, n: number): Complex => c(a.re * n, a.im * n);
const div = (a: Complex, b: Complex): Complex => {
  const denominator = b.re * b.re + b.im * b.im;
  if (denominator === 0) throw new Error("Cannot divide by zero in the line model.");
  return c((a.re * b.re + a.im * b.im) / denominator, (a.im * b.re - a.re * b.im) / denominator);
};
const magnitude = (a: Complex): number => Math.hypot(a.re, a.im);
const angleDeg = (a: Complex): number => (Math.atan2(a.im, a.re) * 180) / Math.PI;
const conjugate = (a: Complex): Complex => c(a.re, -a.im);

function sqrtComplex(a: Complex): Complex {
  const r = magnitude(a);
  const re = Math.sqrt(Math.max(0, (r + a.re) / 2));
  const im = Math.sqrt(Math.max(0, (r - a.re) / 2)) * (a.im < 0 ? -1 : 1);
  return c(re, im);
}

function sinhComplex(a: Complex): Complex {
  return c(Math.sinh(a.re) * Math.cos(a.im), Math.cosh(a.re) * Math.sin(a.im));
}

function coshComplex(a: Complex): Complex {
  return c(Math.cosh(a.re) * Math.cos(a.im), Math.sinh(a.re) * Math.sin(a.im));
}

export function validatePerformanceInput(input: PerformanceInput): string[] {
  const errors: string[] = [];
  const positive: [keyof PerformanceInput, string][] = [
    ["lengthKm", "Line length"],
    ["resistanceOhmKm", "Resistance"],
    ["inductanceMhKm", "Inductance"],
    ["capacitanceNfKm", "Capacitance"],
    ["receivingVoltageKv", "Receiving-end voltage"],
    ["receivingPowerMw", "Receiving-end power"],
  ];
  for (const [key, label] of positive) {
    const value = input[key];
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
      errors.push(`${label} must be a positive number.`);
    }
  }
  if (input.frequencyHz !== 50 && input.frequencyHz !== 60) {
    errors.push("Frequency must be 50 or 60 Hz.");
  }
  if (!(input.powerFactor > 0 && input.powerFactor <= 1)) {
    errors.push("Power factor must be greater than 0 and no greater than 1.");
  }
  return errors;
}

function constantsFor(input: PerformanceInput, model: PerformanceModel): { abcd: AbcdConstants; z: Complex; y: Complex } {
  const omega = 2 * Math.PI * input.frequencyHz;
  const zPerKm = c(input.resistanceOhmKm, omega * input.inductanceMhKm * 1e-3);
  const yPerKm = c(0, omega * input.capacitanceNfKm * 1e-9);
  const z = scale(zPerKm, input.lengthKm);
  const y = scale(yPerKm, input.lengthKm);
  const one = c(1, 0);
  const zero = c(0, 0);

  if (model === "short") return { abcd: { A: one, B: z, C: zero, D: one }, z, y };

  if (model === "nominal-pi") {
    const yz = mul(y, z);
    const halfYz = scale(yz, 0.5);
    const a = add(one, halfYz);
    const lineC = mul(y, add(one, scale(yz, 0.25)));
    return { abcd: { A: a, B: z, C: lineC, D: a }, z, y };
  }

  if (model === "nominal-t") {
    const yz = mul(y, z);
    const a = add(one, scale(yz, 0.5));
    const b = mul(z, add(one, scale(yz, 0.25)));
    return { abcd: { A: a, B: b, C: y, D: a }, z, y };
  }

  const gammaPerKm = sqrtComplex(mul(zPerKm, yPerKm));
  const gammaLength = scale(gammaPerKm, input.lengthKm);
  const characteristicImpedance = sqrtComplex(div(zPerKm, yPerKm));
  const cosh = coshComplex(gammaLength);
  const sinh = sinhComplex(gammaLength);
  return {
    abcd: {
      A: cosh,
      B: mul(characteristicImpedance, sinh),
      C: div(sinh, characteristicImpedance),
      D: cosh,
    },
    z,
    y,
  };
}

export function calculatePerformance(input: PerformanceInput, model: PerformanceModel): PerformanceResult {
  const errors = validatePerformanceInput(input);
  if (errors.length) throw new Error(errors.join(" "));

  const { abcd, z, y } = constantsFor(input, model);
  const vrMagnitude = (input.receivingVoltageKv * 1000) / Math.sqrt(3);
  const currentMagnitude = (input.receivingPowerMw * 1e6) /
    (Math.sqrt(3) * input.receivingVoltageKv * 1000 * input.powerFactor);
  const currentAngle = input.powerFactorMode === "lagging"
    ? -Math.acos(input.powerFactor)
    : input.powerFactorMode === "leading"
      ? Math.acos(input.powerFactor)
      : 0;
  const receivingVoltagePhase = c(vrMagnitude, 0);
  const receivingCurrent = c(currentMagnitude * Math.cos(currentAngle), currentMagnitude * Math.sin(currentAngle));
  const sendingVoltagePhase = add(mul(abcd.A, receivingVoltagePhase), mul(abcd.B, receivingCurrent));
  const sendingCurrent = add(mul(abcd.C, receivingVoltagePhase), mul(abcd.D, receivingCurrent));
  const sendingPower = scale(mul(sendingVoltagePhase, conjugate(sendingCurrent)), 3 / 1e6);
  const sendingApparentPower = magnitude(sendingPower);
  const receivingNoLoad = div(sendingVoltagePhase, abcd.A);
  const noLoadCurrent = mul(abcd.C, receivingNoLoad);
  const fullLoadVoltage = magnitude(receivingVoltagePhase);
  const noLoadVoltage = magnitude(receivingNoLoad);
  const sendingLineVoltage = magnitude(sendingVoltagePhase) * Math.sqrt(3) / 1000;

  return {
    model,
    abcd,
    zTotal: z,
    yTotal: y,
    receivingVoltagePhase,
    receivingCurrent,
    sendingVoltagePhase,
    sendingCurrent,
    sendingVoltageKv: sendingLineVoltage,
    sendingVoltageAngleDeg: angleDeg(sendingVoltagePhase),
    sendingCurrentA: magnitude(sendingCurrent),
    sendingCurrentAngleDeg: angleDeg(sendingCurrent),
    sendingPowerMw: sendingPower.re,
    sendingReactivePowerMvar: sendingPower.im,
    sendingPowerFactor: sendingApparentPower === 0 ? 0 : Math.abs(sendingPower.re) / sendingApparentPower,
    powerLossMw: sendingPower.re - input.receivingPowerMw,
    efficiencyPercent: (input.receivingPowerMw / sendingPower.re) * 100,
    regulationPercent: ((noLoadVoltage - fullLoadVoltage) / fullLoadVoltage) * 100,
    noLoadReceivingVoltagePhase: receivingNoLoad,
    noLoadChargingCurrentA: magnitude(noLoadCurrent),
    ferrantiRisePercent: ((noLoadVoltage - magnitude(sendingVoltagePhase)) / magnitude(sendingVoltagePhase)) * 100,
    abcdDeterminant: sub(mul(abcd.A, abcd.D), mul(abcd.B, abcd.C)),
  };
}

export function calculateAllPerformanceModels(input: PerformanceInput): PerformanceResult[] {
  return (["short", "nominal-pi", "nominal-t", "long"] as const).map((model) =>
    calculatePerformance(input, model),
  );
}

export function formatComplex(value: Complex, digits = 4): string {
  const sign = value.im < 0 ? "−" : "+";
  return `${value.re.toPrecision(digits)} ${sign} j${Math.abs(value.im).toPrecision(digits)}`;
}

export function formatPolar(value: Complex, digits = 4): string {
  return `${magnitude(value).toPrecision(digits)} ∠ ${angleDeg(value).toFixed(2)}°`;
}