import {
  SKILL_ABILITY,
  type ProficiencyTier,
  type SkillKey,
} from "../config/kedom.ts";
import { SKILL_SPECIALIZATION_KIND } from "../config/specializations.ts";
import type { CharacterData, SkillFields } from "../data/actor/character.ts";
import { buildSkillCheck, skillCheckIsSpecialized } from "./build-skill-check.ts";
import type { CheckConfigureOptions } from "./check-configure.ts";
import { renderGradedCheckContent } from "./check-card.ts";
import { labeledCheckFormula } from "./labeled-formula.ts";
import {
  advantageFlavorSuffix,
  checkDiceExpression,
  resolveCheckConfigure,
  withSituationalModifier,
} from "./resolve-check-configure.ts";
import { resolveOutcome } from "./resolve-outcome.ts";

export { modifierTooltipParts, styleCheckRollHTML } from "./check-card.ts";

export type SkillCheckOptions = CheckConfigureOptions & {
  /** When set, full proficiency; otherwise half (unless the skill has no specialisations). */
  specializationSlug?: string;
};

function localize(path: string, fallback: string): string {
  const v = game.i18n.localize(path);
  return !v || v === path ? fallback : v;
}

function proficiencyLabels(input: {
  specialized: boolean;
  tierLabel: string;
  specializationLabel: string | null;
}): string {
  if (!input.specialized) {
    return game.i18n.format("KEDOM.Roll.modifier.halfProficiency", {
      proficiency: input.tierLabel,
    });
  }
  if (input.specializationLabel !== null) {
    return game.i18n.format("KEDOM.Roll.modifier.specialization", {
      specialization: input.specializationLabel,
    });
  }
  return input.tierLabel;
}

/**
 * Shared preparation for sheet totals and chat rolls.
 * Returns null when the skill or ability data is missing.
 */
export function prepareSkillCheck(
  actor: Actor.Implementation,
  skillKey: SkillKey,
  options: SkillCheckOptions = {},
): {
  modifiers: ReturnType<typeof buildSkillCheck>["modifiers"];
  bonus: number;
  skillLabel: string;
  formulaLabel: string;
  specializationLabel: string | null;
} | null {
  const abilityKey = SKILL_ABILITY[skillKey];
  if (abilityKey === undefined) return null;

  const system = actor.system as CharacterData;
  const ability = (system.abilities as Record<string, { mod?: number }>)[abilityKey];
  const skill = (system.skills as Record<SkillKey, SkillFields>)[skillKey];
  if (!ability || !skill) return null;

  const kind = SKILL_SPECIALIZATION_KIND[skillKey];
  let specializationLabel: string | null = null;
  let specializationSlug: string | null = null;

  if (options.specializationSlug !== undefined) {
    const found = skill.specializations.find((s) => s.slug === options.specializationSlug);
    if (!found || found.selected === false) return null;
    specializationSlug = found.slug;
    specializationLabel = found.label;
  }

  const specialized = skillCheckIsSpecialized(kind, specializationSlug !== null);
  const proficiency = skill.proficiency as ProficiencyTier;
  const skillLabel = localize(`KEDOM.Skill.${skillKey}`, skillKey);
  const abilityLabel = localize(`KEDOM.Ability.${abilityKey}.label`, abilityKey);
  const tierLabel = localize(`KEDOM.Proficiency.${proficiency}`, proficiency);
  const abilityMod = ability.mod ?? 0;

  const built = buildSkillCheck({
    skillKey,
    skillLabel,
    abilityKey,
    abilityLabel,
    abilityMod,
    proficiency,
    specialized,
    proficiencyLabel: proficiencyLabels({
      specialized,
      tierLabel,
      specializationLabel,
    }),
    specializationSlug,
    specializationLabel,
  });

  const formulaLabel =
    specializationLabel !== null ? `${skillLabel} (${specializationLabel})` : skillLabel;

  return {
    modifiers: built.modifiers,
    bonus: built.bonus,
    skillLabel,
    formulaLabel,
    specializationLabel,
  };
}

export async function rollSkillCheck(
  actor: Actor.Implementation,
  skillKey: string,
  options: SkillCheckOptions = {},
): Promise<void> {
  if (!(skillKey in SKILL_ABILITY)) {
    ui.notifications.error(game.i18n.format("KEDOM.Chat.UnknownSkill", { skill: skillKey }));
    return;
  }

  const key = skillKey as SkillKey;
  const prepared = prepareSkillCheck(actor, key, options);
  if (!prepared) {
    if (options.specializationSlug !== undefined) {
      ui.notifications.error(
        game.i18n.format("KEDOM.Error.UnknownSpecializationSlug", {
          slug: options.specializationSlug,
        }),
      );
      return;
    }
    ui.notifications.error(game.i18n.localize("KEDOM.Chat.MissingSkillData"));
    return;
  }

  const { modifiers: baseModifiers, formulaLabel } = prepared;
  const system = actor.system as CharacterData;
  const skill = (system.skills as Record<SkillKey, SkillFields>)[key];
  const skillBaseDice = Math.max(1, Math.floor(skill?.baseDice ?? 2));
  const skillDefaultAdv = Math.floor(skill?.defaultAdvantage ?? 0);
  const configured = await resolveCheckConfigure(
    game.i18n.format("KEDOM.Roll.Dialog.titleSkill", { skill: formulaLabel }),
    baseModifiers,
    {
      ...options,
      advantageNet: options.advantageNet ?? skillDefaultAdv,
      baseDice: options.baseDice ?? skillBaseDice,
    },
  );
  if (!configured) return;

  const modifiers = withSituationalModifier(baseModifiers, configured.situational);
  const { difficulty, advantageNet, baseDice } = configured;
  const difficultyLabel = localize(
    `KEDOM.DifficultyColumn.${difficulty}`,
    difficulty.charAt(0).toUpperCase() + difficulty.slice(1),
  );
  const formula = labeledCheckFormula(
    checkDiceExpression(advantageNet, baseDice),
    formulaLabel,
    modifiers,
  );
  const roll = await new Roll(formula).evaluate();
  const total = roll.total ?? 0;
  const outcome = resolveOutcome({ total, difficulty });

  const content = await renderGradedCheckContent({
    roll,
    outcome,
    modifiers,
    effectiveTotal: total,
  });

  const messageData = {
    speaker: ChatMessage.getSpeaker({ actor: actor as Actor.Stored }),
    flavor:
      game.i18n.format("KEDOM.Chat.SkillCheckFlavor", {
        skill: formulaLabel,
        difficulty: difficultyLabel,
      }) + advantageFlavorSuffix(advantageNet),
    content,
    rolls: [roll],
    sound: CONFIG.sounds.dice,
    flags: {
      kedom: {
        check: {
          kind: "skill" as const,
          actorUuid: actor.uuid,
          skillKey: key,
          specializationSlug: options.specializationSlug,
          difficulty,
          advantageNet,
          baseDice,
          situational: configured.situational,
          total,
          diceTotal: total,
          luckSpent: 0,
          modifiers: modifiers.map((m) => ({ label: m.label, value: m.value })),
        },
      },
    },
  };
  // @ts-expect-error fvtt-types: kedom system flags are not in the core ChatMessage flag union yet
  await ChatMessage.create(messageData);
}
