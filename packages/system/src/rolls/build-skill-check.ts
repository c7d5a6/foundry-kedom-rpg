import { PROFICIENCY_BONUS, type ProficiencyTier } from "../config/kedom.ts";
import type { SpecializationKind } from "../config/specializations.ts";
import { appliedProficiencyBonus } from "../derivations/skill-proficiency.ts";
import { collectSkillCheckModifiers, type Modifier } from "./collectors.ts";

export interface BuildSkillCheckInput {
  skillKey: string;
  skillLabel: string;
  abilityKey: string;
  abilityLabel: string;
  abilityMod: number;
  proficiency: ProficiencyTier;
  /** Full proficiency when true; half when false (skills with no specs always true). */
  specialized: boolean;
  proficiencyLabel: string;
  specializationSlug: string | null;
  specializationLabel: string | null;
}

export interface BuiltSkillCheck {
  modifiers: Modifier[];
  /** Sum of collected modifiers — the flat bonus on `2d10 + bonus`. */
  bonus: number;
}

/** Skills with no specialisations always use full proficiency. */
export function skillCheckIsSpecialized(
  kind: SpecializationKind,
  hasSpecialization: boolean,
): boolean {
  return kind === "none" || hasSpecialization;
}

export function sumModifiers(modifiers: readonly Modifier[]): number {
  let total = 0;
  for (const mod of modifiers) total += mod.value;
  return total;
}

/**
 * Shared path for sheet display and rolling: collect modifiers, then sum.
 * Do not recompute the bonus with a parallel formula.
 */
export function buildSkillCheck(input: BuildSkillCheckInput): BuiltSkillCheck {
  const tierBonus = PROFICIENCY_BONUS[input.proficiency];
  const proficiencyBonus = appliedProficiencyBonus({
    tierBonus,
    specialized: input.specialized,
  });
  const modifiers = collectSkillCheckModifiers({
    skillKey: input.skillKey,
    skillLabel: input.skillLabel,
    abilityKey: input.abilityKey,
    abilityLabel: input.abilityLabel,
    abilityMod: input.abilityMod,
    proficiency: input.proficiency,
    proficiencyBonus,
    proficiencyLabel: input.proficiencyLabel,
    specialized: input.specialized,
    specializationSlug: input.specializationSlug,
    specializationLabel: input.specializationLabel,
  });
  return { modifiers, bonus: sumModifiers(modifiers) };
}

export function formatSignedBonus(bonus: number): string {
  return bonus >= 0 ? `+${String(bonus)}` : String(bonus);
}
