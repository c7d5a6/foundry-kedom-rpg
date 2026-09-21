export type ModifierSource = {
  id: string;
  label: string;
};

export type Modifier = {
  label: string;
  value: number;
  source: ModifierSource;
  kind: "ability" | "skill" | "specialization" | "armor" | "effect" | "situational";
};

export type SkillCheckContext = {
  skillKey: string;
  skillLabel: string;
  abilityKey: string;
  abilityLabel: string;
  abilityMod: number;
  proficiency: string;
  proficiencyBonus: number;
  proficiencyLabel: string;
};

export function collectAbilityModifier(ctx: SkillCheckContext): Modifier[] {
  return [
    {
      label: ctx.abilityLabel,
      value: ctx.abilityMod,
      source: { id: `ability.${ctx.abilityKey}`, label: ctx.abilityLabel },
      kind: "ability",
    },
  ];
}

export function collectProficiency(ctx: SkillCheckContext): Modifier[] {
  return [
    {
      label: ctx.proficiencyLabel,
      value: ctx.proficiencyBonus,
      source: { id: `skill.${ctx.skillKey}.proficiency`, label: ctx.proficiencyLabel },
      kind: "skill",
    },
  ];
}

export function collectSkillCheckModifiers(ctx: SkillCheckContext): Modifier[] {
  return [...collectAbilityModifier(ctx), ...collectProficiency(ctx)];
}
