import { OUTCOME_BANDS, type DifficultyColumn, type GradedOutcome } from "../config/kedom.ts";

export type { GradedOutcome };

/**
 * Look up the stored kind and degree for a roll total on one difficulty column.
 */
export function resolveOutcome(input: {
  total: number;
  difficulty: DifficultyColumn;
}): GradedOutcome {
  const { total, difficulty } = input;
  for (const band of OUTCOME_BANDS) {
    if (band.max === null || total <= band.max) return band[difficulty];
  }
  const last = OUTCOME_BANDS[OUTCOME_BANDS.length - 1];
  if (last !== undefined) return last[difficulty];
  return { kind: "success", degree: 1 };
}
