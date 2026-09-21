import {
  DEFAULT_DIFFICULTY,
  PROFICIENCY_BONUS,
  SKILL_ABILITY,
  SKILL_CHECK_DICE,
  type GradedOutcome,
  type ProficiencyTier,
  type SkillKey,
} from "../config/kedom.ts";
import { SKILL_SPECIALIZATION_KIND } from "../config/specializations.ts";
import type { CharacterData, SkillFields } from "../data/actor/character.ts";
import { appliedProficiencyBonus } from "../derivations/skill-proficiency.ts";
import { collectSkillCheckModifiers } from "./collectors.ts";
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
  const abilityKey = SKILL_ABILITY[key];
  if (!abilityKey) {
    ui.notifications.error(game.i18n.format("KEDOM.Chat.UnknownSkill", { skill: skillKey }));
    return;
  }

  const system = actor.system as CharacterData;
  const ability = (system.abilities as Record<string, { mod?: number }>)[abilityKey];
  const skill = (system.skills as Record<SkillKey, SkillFields>)[key];
  if (!ability || !skill) {
    ui.notifications.error(game.i18n.localize("KEDOM.Chat.MissingSkillData"));
    return;
  }

  const kind = SKILL_SPECIALIZATION_KIND[key];
  const specializationSlug = options.specializationSlug;
  let specializationLabel: string | null = null;
  let specialized = kind === "none";

  if (specializationSlug !== undefined) {
    const found = skill.specializations.find((s) => s.slug === specializationSlug);
    if (!found) {
      ui.notifications.error(
        game.i18n.format("KEDOM.Error.UnknownSpecializationSlug", { slug: specializationSlug }),
      );
      return;
    }
    specialized = true;
    specializationLabel = found.label;
  }

  const proficiency = skill.proficiency as ProficiencyTier;
  const tierBonus = PROFICIENCY_BONUS[proficiency] ?? -2;
  const proficiencyBonus = appliedProficiencyBonus({ tierBonus, specialized });

  const skillLabel = localize(`KEDOM.Skill.${key}`, key);
  const abilityLabel = localize(`KEDOM.Ability.${abilityKey}.label`, abilityKey);
  const tierLabel = localize(`KEDOM.Proficiency.${proficiency}`, proficiency);
  const proficiencyLabel = specialized
    ? specializationLabel !== null
      ? game.i18n.format("KEDOM.Roll.Modifier.specialization", {
          specialization: specializationLabel,
        })
      : tierLabel
    : game.i18n.format("KEDOM.Roll.Modifier.halfProficiency", { proficiency: tierLabel });
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
    specialized,
    specializationSlug: specializationSlug ?? null,
    specializationLabel,
  });

  const formulaLabel =
    specializationLabel !== null ? `${skillLabel} (${specializationLabel})` : skillLabel;
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
