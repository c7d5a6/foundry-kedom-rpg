import {
  DEFAULT_DIFFICULTY,
  PROFICIENCY_BONUS,
  SAVE_ABILITY,
  SKILL_CHECK_DICE,
  type ProficiencyTier,
  type SaveKey,
} from "../config/kedom.ts";
import type { CharacterData, SaveFields } from "../data/actor/character.ts";
import { formatSignedBonus } from "./build-skill-check.ts";
import { labeledCheckFormula } from "./labeled-formula.ts";
import { resolveOutcome } from "./resolve-outcome.ts";
import { styleCheckRollHTML } from "./skill-check.ts";

const CHECK_TEMPLATE = "systems/kedom/templates/chat/check.hbs";

function localize(path: string, fallback: string): string {
  const v = game.i18n.localize(path);
  return !v || v === path ? fallback : v;
}

/**
 * Saves use the skill die and full proficiency bonus (no specialisations).
 */
export async function rollSaveCheck(
  actor: Actor.Implementation,
  saveKey: SaveKey,
): Promise<void> {
  const system = actor.system as CharacterData;
  const save = system.saves[saveKey] as SaveFields | undefined;
  const abilityKey = SAVE_ABILITY[saveKey];
  if (!save || !abilityKey) {
    ui.notifications.error(game.i18n.localize("KEDOM.Chat.MissingSkillData"));
    return;
  }

  const ability = (system.abilities as Record<string, { mod?: number }>)[abilityKey];
  const abilityMod = ability?.mod ?? 0;
  const tier = save.proficiency as ProficiencyTier;
  const profBonus = PROFICIENCY_BONUS[tier] ?? 0;
  const bonus = abilityMod + profBonus;

  const saveLabel = localize(`KEDOM.Save.${saveKey}`, saveKey);
  const abilityLabel = localize(`KEDOM.Ability.${abilityKey}.label`, abilityKey);
  const tierLabel = localize(`KEDOM.Proficiency.${tier}`, tier);

  const modifiers = [
    {
      label: abilityLabel,
      value: abilityMod,
      source: { id: `ability.${abilityKey}`, label: abilityLabel },
      kind: "ability" as const,
    },
    {
      label: tierLabel,
      value: profBonus,
      source: { id: `save.${saveKey}.proficiency`, label: tierLabel },
      kind: "skill" as const,
    },
  ].filter((m) => m.value !== 0);

  const difficulty = DEFAULT_DIFFICULTY;
  const difficultyLabel = localize(
    `KEDOM.DifficultyColumn.${difficulty}`,
    difficulty.charAt(0).toUpperCase() + difficulty.slice(1),
  );
  const formula = labeledCheckFormula(SKILL_CHECK_DICE, saveLabel, modifiers);
  const roll = await new Roll(formula).evaluate();
  const total = roll.total ?? 0;
  const outcome = resolveOutcome({ total, difficulty });

  let panelClass: "success" | "failure" | "cost" = "success";
  let verdictLabel = localize("KEDOM.Outcome.success", "Success");
  let iconKind: "success" | "failure" = "success";
  if (outcome.kind === "failure") {
    panelClass = "failure";
    verdictLabel = localize("KEDOM.Outcome.failure", "Failure");
    iconKind = "failure";
  } else if (outcome.kind === "cost") {
    panelClass = "cost";
    verdictLabel = localize("KEDOM.Outcome.cost", "Success at a Cost");
  }

  const degreeIcons = Array.from({ length: outcome.degree }, () => ({
    cssClass: iconKind === "success" ? "fa-dice-d20" : "fa-skull",
    kind: iconKind,
  }));

  const rollHTML = styleCheckRollHTML(await roll.render(), {
    panelClass,
    verdictLabel,
    degreeIcons,
    outcomeSummary: verdictLabel,
    modifiers,
  });

  const content = await foundry.applications.handlebars.renderTemplate(CHECK_TEMPLATE, {
    outcome,
    rollHTML,
  });

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: actor as Actor.Stored }),
    flavor: game.i18n.format("KEDOM.Chat.SaveCheckFlavor", {
      save: saveLabel,
      difficulty: difficultyLabel,
      bonus: formatSignedBonus(bonus),
    }),
    content,
    rolls: [roll],
    sound: CONFIG.sounds.dice,
  });
}
