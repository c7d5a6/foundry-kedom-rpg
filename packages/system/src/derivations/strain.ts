/** Strain Limit and Resolve from Focus score (3–18). */

/** Maximum System Strain — equals Focus score. */
export function strainLimitFromFocus(focusScore: number): number {
  return focusScore;
}

/** Strain Save high threshold — 20 minus Focus score. */
export function resolveFromFocus(focusScore: number): number {
  return 20 - focusScore;
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
