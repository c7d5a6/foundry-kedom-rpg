import { characterData } from "../types/accessors.ts";
import { localize } from "../i18n/localize.ts";
import {
  PROFICIENCY_BONUS,
  SKILL_ABILITY,
  type ProficiencyTier,
  type SkillKey,
} from "../config/kedom.ts";
import { appliedProficiencyBonus } from "../derivations/skill-proficiency.ts";
import { effectDeltaModifiers } from "../rolls/effect-modifier.ts";
import { SKILL_SPECIALIZATION_KIND } from "../config/specializations.ts";
import type { SkillFields } from "../data/actor/character.ts";
import {
  buildSkillCheck,
  skillCheckIsSpecialized,
  sumModifiers,
} from "../rolls/build-skill-check.ts";
import type { Modifier } from "../rolls/collectors.ts";
import type { CheckConfigureOptions } from "../rolls/check-configure.ts";
import { renderGradedCheckContent } from "./check-card.ts";
import { labeledCheckFormula } from "../rolls/labeled-formula.ts";
import {
  advantageFlavorSuffix,
  difficultyFlavorLabel,
  checkDiceExpression,
  resolveCheckConfigure,
  withSituationalModifier,
} from "./resolve-check-configure.ts";
import { resolveOutcome } from "../rolls/resolve-outcome.ts";

export { styleCheckRollHTML } from "./check-card.ts";

export type SkillCheckOptions = CheckConfigureOptions & {
  /** When set, full proficiency; otherwise half (unless the skill has no specialisations). */
  specializationSlug?: string;
};

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

  const system = characterData(actor);
  const ability = (system.abilities as Record<string, { mod?: number }>)[abilityKey];
  const skill = (system.skills as Record<SkillKey, SkillFields>)[skillKey];
  if (!ability || !skill) return null;

  const kind = SKILL_SPECIALIZATION_KIND[skillKey] ?? "none";
  let specializationLabel: string | null = null;
  let specializationSlug: string | null = null;

  if (options.specializationSlug !== undefined) {
    const found = skill.specializations.find((s) => s.slug === options.specializationSlug);
    if (found?.selected !== true) return null;
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

  const effectMods = effectDeltaModifiers({
    derived: skill.proficiencyBonus,
    expected: appliedProficiencyBonus({
      tierBonus: (PROFICIENCY_BONUS as Partial<Record<string, number>>)[proficiency] ?? 0,
      specialized: kind === "none",
    }),
    id: `skill.${skillKey}.effects`,
    label: localize("KEDOM.Roll.modifier.effects", "Effects"),
  });
  const modifiers = [...built.modifiers, ...effectMods];
  const bonus = built.bonus + sumModifiers(effectMods);

  const formulaLabel =
    specializationLabel !== null ? `${skillLabel} (${specializationLabel})` : skillLabel;

  return {
    modifiers,
    bonus,
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
  if (!Object.hasOwn(SKILL_ABILITY, skillKey)) {
    ui.notifications.error(game.i18n.format("KEDOM.Chat.UnknownSkill", { skill: skillKey }));
    return;
  }

  const key = skillKey;
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
  const system = characterData(actor);
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
  const difficultyLabel = difficultyFlavorLabel(difficulty);
  const formula = labeledCheckFormula(
    checkDiceExpression(advantageNet, baseDice),
    formulaLabel,
    modifiers,
  );
  const roll = await new Roll(formula).evaluate();
  const total = roll.total;
  const outcome = resolveOutcome({ total, difficulty });

  const content = await renderGradedCheckContent({
    roll,
    outcome,
    modifiers,
    effectiveTotal: total,
    difficulty,
  });

  await postSkillCheckCard({
    actor,
    skillKey: key,
    specializationSlug: options.specializationSlug,
    roll,
    content,
    modifiers,
    configured,
    formulaLabel,
    difficultyLabel,
    total,
  });
}

async function postSkillCheckCard(args: {
  actor: Actor.Implementation;
  skillKey: string;
  specializationSlug: string | undefined;
  roll: Roll;
  content: string;
  modifiers: readonly Modifier[];
  configured: NonNullable<Awaited<ReturnType<typeof resolveCheckConfigure>>>;
  formulaLabel: string;
  difficultyLabel: string;
  total: number;
}): Promise<void> {
  const { actor, skillKey, specializationSlug, roll, content, modifiers, configured } = args;
  const { formulaLabel, difficultyLabel, total } = args;
  const { difficulty, advantageNet, baseDice } = configured;
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
          skillKey,
          specializationSlug,
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
