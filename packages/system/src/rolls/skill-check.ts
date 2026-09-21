import {
  DEFAULT_DIFFICULTY,
  PROFICIENCY_BONUS,
  SKILL_ABILITY,
  SKILL_CHECK_DICE,
  type GradedOutcome,
  type ProficiencyTier,
  type SkillKey,
} from "../config/kedom.ts";
import type { CharacterData } from "../data/actor/character.ts";
import { collectSkillCheckModifiers } from "./collectors.ts";
import { labeledCheckFormula } from "./labeled-formula.ts";
import { resolveOutcome } from "./resolve-outcome.ts";

const CHECK_TEMPLATE = "systems/kedom/templates/chat/check.hbs";

function localize(path: string, fallback: string): string {
  const v = game.i18n.localize(path);
  return !v || v === path ? fallback : v;
}

function verdictFor(outcome: GradedOutcome): {
  verdictKind: "success" | "failure";
  verdictLabel: string;
  iconKind: "success" | "failure";
} {
  if (outcome.kind === "failure") {
    return {
      verdictKind: "failure",
      verdictLabel: localize("KEDOM.Outcome.failure", "Failure"),
      iconKind: "failure",
    };
  }
  // Success and success-at-a-cost both read as Success; cost uses fail icons.
  return {
    verdictKind: "success",
    verdictLabel: localize("KEDOM.Outcome.success", "Success"),
    iconKind: outcome.kind === "cost" ? "failure" : "success",
  };
}

function degreeIcons(
  degree: number,
  iconKind: "success" | "failure",
): { cssClass: string; kind: string }[] {
  const cssClass = iconKind === "success" ? "fa-check" : "fa-times";
  return Array.from({ length: degree }, () => ({ cssClass, kind: iconKind }));
}

/** Move degree icons to sit directly above Foundry's `.dice-total`. */
export function placeCheckDegreeIcons(html: HTMLElement): void {
  const check = html.querySelector(".kedom-chat-check");
  if (!(check instanceof HTMLElement)) return;
  const degrees = check.querySelector(".kedom-chat-check__degrees");
  const total = html.querySelector(".dice-total");
  if (!(degrees instanceof HTMLElement) || !(total instanceof HTMLElement)) return;
  if (degrees.nextElementSibling === total) return;
  total.insertAdjacentElement("beforebegin", degrees);
}

export async function rollSkillCheck(actor: Actor.Implementation, skillKey: string): Promise<void> {
  if (!(skillKey in SKILL_ABILITY)) {
    ui.notifications.error(game.i18n.format("KEDOM.Chat.UnknownSkill", { skill: skillKey }));
    return;
  }

  const key = skillKey as SkillKey;
  const abilityKey = SKILL_ABILITY[key];
  if (!abilityKey) {
    ui.notifications.error(game.i18n.format("KEDOM.Chat.UnknownSkill", { skill: skillKey }));
    return;
  }

  const system = actor.system as CharacterData;
  const ability = (system.abilities as Record<string, { mod?: number }>)[abilityKey];
  const skill = (system.skills as Record<SkillKey, { proficiency: string }>)[key];
  if (!ability || !skill) {
    ui.notifications.error(game.i18n.localize("KEDOM.Chat.MissingSkillData"));
    return;
  }

  const proficiency = skill.proficiency as ProficiencyTier;
  const proficiencyBonus = PROFICIENCY_BONUS[proficiency] ?? -2;

  const skillLabel = localize(`KEDOM.Skill.${key}`, key);
  const abilityLabel = localize(`KEDOM.Ability.${abilityKey}.label`, abilityKey);
  const proficiencyLabel = localize(`KEDOM.Proficiency.${proficiency}`, proficiency);
  const abilityMod = ability.mod ?? 0;

  const modifiers = collectSkillCheckModifiers({
    skillKey: key,
    skillLabel,
    abilityKey,
    abilityLabel,
    abilityMod,
    proficiency,
    proficiencyBonus,
    proficiencyLabel,
  });

  const formula = labeledCheckFormula(SKILL_CHECK_DICE, skillLabel, modifiers);
  const roll = await new Roll(formula).evaluate();
  const total = roll.total ?? 0;
  const outcome = resolveOutcome({ total, difficulty: DEFAULT_DIFFICULTY });
  const verdict = verdictFor(outcome);

  const content = await foundry.applications.handlebars.renderTemplate(CHECK_TEMPLATE, {
    outcome,
    verdictKind: verdict.verdictKind,
    verdictLabel: verdict.verdictLabel,
    degreeIcons: degreeIcons(outcome.degree, verdict.iconKind),
    // Custom HTML content prevents core from appending roll.render() itself
    // (ChatMessage#renderRollContent only injects when content has no elements).
    rollHTML: await roll.render(),
  });

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: actor as Actor.Stored }),
    flavor: skillLabel,
    content,
    rolls: [roll],
    sound: CONFIG.sounds.dice,
  });
}
