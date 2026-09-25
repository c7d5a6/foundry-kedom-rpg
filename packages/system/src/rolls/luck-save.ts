import { PROFICIENCY_BONUS, type ProficiencyTier } from "../config/kedom.ts";
import type { CharacterData, SaveFields } from "../data/actor/character.ts";
import { luckSaveDiceTerm } from "./advantage.ts";
import { formatSignedBonus } from "./build-skill-check.ts";
import type { CheckConfigureOptions } from "./check-configure.ts";
import { renderGradedCheckContent } from "./check-card.ts";
import { labeledCheckFormula } from "./labeled-formula.ts";
import {
  advantageFlavorSuffix,
  resolveCheckConfigure,
  withSituationalModifier,
} from "./resolve-check-configure.ts";
import { resolveOutcome } from "./resolve-outcome.ts";

function localize(path: string, fallback: string): string {
  const v = game.i18n.localize(path);
  return !v || v === path ? fallback : v;
}

/**
 * Luck save: `d20` + Luck mod + proficiency, graded on the class-save difficulty ladder.
 * Configure dialog is opt-in (Ctrl/⌘-click or setting), same as skills/saves.
 * No Luck spend on this card.
 */
export async function rollLuckSave(
  actor: Actor.Implementation,
  options: CheckConfigureOptions = {},
): Promise<void> {
  const system = actor.system as CharacterData;
  const save = system.saves.luck as SaveFields | undefined;
  const lck = (system.abilities as { lck?: { mod?: number } }).lck;
  if (!save) {
    ui.notifications.error(game.i18n.localize("KEDOM.Chat.MissingSkillData"));
    return;
  }

  const abilityMod = lck?.mod ?? 0;
  const tier = save.proficiency as ProficiencyTier;
  const profBonus = PROFICIENCY_BONUS[tier] ?? 0;
  const bonus = abilityMod + profBonus;

  const saveLabel = localize("KEDOM.Save.luck", "Luck");
  const abilityLabel = localize("KEDOM.Ability.lck.label", "Luck");
  const tierLabel = localize(`KEDOM.Proficiency.${tier}`, tier);

  const baseModifiers = [
    {
      label: abilityLabel,
      value: abilityMod,
      source: { id: "ability.lck", label: abilityLabel },
      kind: "ability" as const,
    },
    {
      label: tierLabel,
      value: profBonus,
      source: { id: "save.luck.proficiency", label: tierLabel },
      kind: "skill" as const,
    },
  ].filter((m) => m.value !== 0);

  const configured = await resolveCheckConfigure(
    game.i18n.format("KEDOM.Roll.Dialog.titleSave", { save: saveLabel }),
    baseModifiers,
    options,
  );
  if (!configured) return;

  const modifiers = withSituationalModifier(baseModifiers, configured.situational);
  const { difficulty, advantageNet } = configured;
  const difficultyLabel = localize(
    `KEDOM.DifficultyColumn.${difficulty}`,
    difficulty.charAt(0).toUpperCase() + difficulty.slice(1),
  );
  const formula = labeledCheckFormula(luckSaveDiceTerm(advantageNet), saveLabel, modifiers);
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
      game.i18n.format("KEDOM.Chat.LuckSaveFlavor", {
        difficulty: difficultyLabel,
        bonus: formatSignedBonus(bonus),
      }) + advantageFlavorSuffix(advantageNet),
    content,
    rolls: [roll],
    sound: CONFIG.sounds.dice,
    flags: {
      kedom: {
        check: {
          kind: "luck-save" as const,
          actorUuid: actor.uuid,
          difficulty,
          advantageNet,
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
