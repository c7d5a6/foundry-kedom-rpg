import {
  DEFAULT_DIFFICULTY,
  SKILL_ABILITY,
  SKILL_CHECK_DICE,
  type GradedOutcome,
  type ProficiencyTier,
  type SkillKey,
} from "../config/kedom.ts";
import { SKILL_SPECIALIZATION_KIND } from "../config/specializations.ts";
import type { CharacterData, SkillFields } from "../data/actor/character.ts";
import { buildSkillCheck, skillCheckIsSpecialized } from "./build-skill-check.ts";
import { labeledCheckFormula } from "./labeled-formula.ts";
import { resolveOutcome } from "./resolve-outcome.ts";

const CHECK_TEMPLATE = "systems/kedom/templates/chat/check.hbs";

export type SkillCheckOptions = {
  /** When set, full proficiency; otherwise half (unless the skill has no specialisations). */
  specializationSlug?: string;
};

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
    if (!found) return null;
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

  const { modifiers, formulaLabel } = prepared;
  const formula = labeledCheckFormula(SKILL_CHECK_DICE, formulaLabel, modifiers);
  const roll = await new Roll(formula).evaluate();
  const total = roll.total ?? 0;
  const outcome = resolveOutcome({ total, difficulty: DEFAULT_DIFFICULTY });
  const verdict = verdictFor(outcome);

  const content = await foundry.applications.handlebars.renderTemplate(CHECK_TEMPLATE, {
    outcome,
    verdictKind: verdict.verdictKind,
    verdictLabel: verdict.verdictLabel,
    degreeIcons: degreeIcons(outcome.degree, verdict.iconKind),
    rollHTML: await roll.render(),
  });

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: actor as Actor.Stored }),
    flavor: formulaLabel,
    content,
    rolls: [roll],
    sound: CONFIG.sounds.dice,
  });
}
