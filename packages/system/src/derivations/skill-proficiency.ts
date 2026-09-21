/**
 * Skill proficiency applied to a check.
 * Full bonus with a relevant specialisation (or on skills that have none).
 * Half bonus (trunc toward zero) when rolling the skill without a specialisation.
 */
export function appliedProficiencyBonus(input: {
  tierBonus: number;
  specialized: boolean;
}): number {
  const { tierBonus, specialized } = input;
  if (specialized) return tierBonus;
  return Math.trunc(tierBonus / 2);
}
