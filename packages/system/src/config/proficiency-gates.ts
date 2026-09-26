import { PROFICIENCY_TIERS, type ProficiencyTier } from "./kedom.ts";

/** Minimum character level required to hold each proficiency tier (rules/20-skills.md). */
export const PROFICIENCY_MIN_LEVEL: Record<ProficiencyTier, number> = {
  untrained: 1,
  apprentice: 1,
  trained: 1,
  expert: 3,
  master: 6,
  legendary: 9,
};

const TIER_RANK = Object.fromEntries(
  PROFICIENCY_TIERS.map((tier, index) => [tier, index]),
) as Record<ProficiencyTier, number>;

export function minLevelForProficiency(tier: string): number {
  return PROFICIENCY_MIN_LEVEL[tier as ProficiencyTier] ?? 1;
}

/** Highest proficiency tier allowed at the given character level. */
export function maxProficiencyForLevel(level: number): ProficiencyTier {
  const lvl = Math.max(1, Math.floor(level || 1));
  let best: ProficiencyTier = "untrained";
  for (const tier of PROFICIENCY_TIERS) {
    if (PROFICIENCY_MIN_LEVEL[tier] <= lvl) best = tier;
  }
  return best;
}

export function proficiencyRank(tier: string): number {
  return TIER_RANK[tier as ProficiencyTier] ?? 0;
}

/**
 * True if raising from `current` to `granted` (max of the two) is allowed at `level`.
 * False when there is no upgrade, or the intended tier exceeds the level gate.
 */
export function canRaiseTo(current: string, granted: string, level: number): boolean {
  const currentRank = proficiencyRank(current);
  const grantedRank = proficiencyRank(granted);
  const nextRank = Math.max(currentRank, grantedRank);
  if (nextRank <= currentRank) return false;
  const nextTier = PROFICIENCY_TIERS[nextRank] ?? "untrained";
  return minLevelForProficiency(nextTier) <= Math.max(1, Math.floor(level || 1));
}

/** Clamp a desired tier down to what the character level allows. */
export function clampProficiencyToLevel(tier: string, level: number): ProficiencyTier {
  const desired = (PROFICIENCY_TIERS.includes(tier as ProficiencyTier)
    ? tier
    : "untrained") as ProficiencyTier;
  const maxAllowed = maxProficiencyForLevel(level);
  return proficiencyRank(desired) <= proficiencyRank(maxAllowed) ? desired : maxAllowed;
}
