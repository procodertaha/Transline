import type { Vec2 } from "./types";

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
