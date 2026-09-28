/** Strain Limit and Resolve from Focus modifier (−3…+3). */

/** Maximum System Strain — `10 + Focus mod`. */
export function strainLimitFromFocus(focusMod: number): number {
  return 10 + Math.floor(focusMod);
}

/** Strain Save high threshold — `10 − Focus mod`. */
export function resolveFromFocus(focusMod: number): number {
  return 10 - Math.floor(focusMod);
}

export type StrainSaveBand = "harm" | "failure" | "success";

/**
 * Strain Save (d20) vs Resolve and current Strain.
 * Harm: d20 <= min(Resolve, Strain); Success: d20 > max(...); else Failure.
 */
export function strainSaveBand(
  d20: number,
  resolve: number,
  strain: number,
): StrainSaveBand {
  const lo = Math.min(resolve, strain);
  const hi = Math.max(resolve, strain);
  if (d20 <= lo) return "harm";
  if (d20 > hi) return "success";
  return "failure";
}
