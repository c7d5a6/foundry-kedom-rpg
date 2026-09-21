/**
 * Skill proficiency applied to a check.
 * Full bonus with a relevant specialisation (or on skills that have none).
 * Without a specialisation, positive bonuses are halved (trunc toward zero);
 * zero and negative tiers are unchanged — half only applies to positive bonuses.
 */
export function appliedProficiencyBonus(input: {
  tierBonus: number;
  specialized: boolean;
}): number {
  const { tierBonus, specialized } = input;
  if (specialized) return tierBonus;
  if (tierBonus <= 0) return tierBonus;
  return Math.trunc(tierBonus / 2);
}
