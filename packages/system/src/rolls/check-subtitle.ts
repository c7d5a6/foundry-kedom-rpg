import type { DifficultyColumn, OutcomeKind } from "../config/kedom.ts";
import { luckCostToNextOutcome } from "./luck-spend.ts";

/** What the next better outcome needs, so a card can say how close the roll was. */
export interface CheckSubtitle {
  /** Null when the total is already the best outcome on this difficulty. */
  next: { kind: OutcomeKind; at: number } | null;
}

export function checkSubtitle(total: number, difficulty: DifficultyColumn): CheckSubtitle {
  const step = luckCostToNextOutcome(total, difficulty);
  if (!step) return { next: null };
  return { next: { kind: step.nextOutcome.kind, at: total + step.cost } };
}
