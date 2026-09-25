import type { DifficultyColumn, GradedOutcome } from "../config/kedom.ts";
import { resolveOutcome } from "./resolve-outcome.ts";

/** Higher = better. Failure worsens with degree; success improves with degree. */
export function outcomeRank(outcome: GradedOutcome): number {
  if (outcome.kind === "failure") return -outcome.degree;
  if (outcome.kind === "cost") return 0;
  return outcome.degree;
}

function isStrictlyBetter(next: GradedOutcome, current: GradedOutcome): boolean {
  return outcomeRank(next) > outcomeRank(current);
}

/**
 * Luck cost (1 Luck = +1 total) to reach the next better graded outcome on a
 * difficulty column. Null when already at the top of the ladder.
 */
export function luckCostToNextOutcome(
  total: number,
  difficulty: DifficultyColumn,
): { cost: number; nextOutcome: GradedOutcome } | null {
  const current = resolveOutcome({ total, difficulty });
  const best = resolveOutcome({ total: Number.MAX_SAFE_INTEGER, difficulty });
  if (outcomeRank(current) >= outcomeRank(best)) return null;

  for (let cost = 1; cost <= 40; cost++) {
    const nextOutcome = resolveOutcome({ total: total + cost, difficulty });
    if (isStrictlyBetter(nextOutcome, current)) {
      return { cost, nextOutcome };
    }
  }
  return null;
}
