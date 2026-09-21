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
  verdictKind: "success" | "failure" | "cost";
  verdictLabel: string;
  iconKind: "success" | "failure";
  panelClass: "success" | "failure" | "cost";
} {
  if (outcome.kind === "failure") {
    return {
      verdictKind: "failure",
      verdictLabel: localize("KEDOM.Outcome.failure", "Failure"),
      iconKind: "failure",
      panelClass: "failure",
    };
  }
  if (outcome.kind === "cost") {
    return {
      verdictKind: "cost",
      verdictLabel: localize("KEDOM.Outcome.cost", "Success at a Cost"),
      iconKind: "success",
      panelClass: "cost",
    };
  }
  return {
    verdictKind: "success",
    verdictLabel: localize("KEDOM.Outcome.success", "Success"),
    iconKind: "success",
    panelClass: "success",
  };
}

function degreeIcons(
  degree: number,
  iconKind: "success" | "failure",
): { cssClass: string; kind: string }[] {
  const cssClass = iconKind === "success" ? "fa-dice-d20" : "fa-skull";
  return Array.from({ length: degree }, () => ({ cssClass, kind: iconKind }));
}

/**
 * Foundry's default tooltip only lists DiceTerms (`Roll#getTooltip` → `this.dice`).
 * Numeric modifiers (`+2[Focus]`) are parsed as NumericTerms and omitted — same gap
 * dnd5e fills via a custom breakdown template. We append matching tooltip-part rows.
 */
export function modifierTooltipParts(
  modifiers: ReadonlyArray<{ label: string; value: number }>,
): { formula: string; flavor: string; total: number }[] {
  return modifiers.map((mod) => ({
    formula: mod.value >= 0 ? `+${String(mod.value)}` : String(mod.value),
    flavor: mod.label,
    total: mod.value,
  }));
}

/**
 * Restyle Foundry's default roll HTML into a CoC-like card:
 * clickable success/fail panel → expand for dice + modifiers → total below.
 */
export function styleCheckRollHTML(
  rollHTML: string,
  opts: {
    panelClass: "success" | "failure" | "cost";
    verdictLabel: string;
    degreeIcons: { cssClass: string; kind: string }[];
    outcomeSummary: string;
    modifiers?: ReadonlyArray<{ label: string; value: number }>;
  },
): string {
  const doc = new DOMParser().parseFromString(rollHTML, "text/html");
  const root = doc.body.firstElementChild;
  if (!(root instanceof HTMLElement)) return rollHTML;

  const diceRoll = root.matches(".dice-roll") ? root : root.querySelector(".dice-roll");
  if (diceRoll instanceof HTMLElement) {
    diceRoll.setAttribute("data-action", "expandRoll");
  }

  const formula = root.querySelector(".dice-formula");
  if (formula instanceof HTMLElement) {
    formula.classList.remove("success", "failure", "cost");
    formula.classList.add(opts.panelClass);
    formula.replaceChildren();

    const text = doc.createElement("span");
    text.className = "kedom-chat-check__verdict-text";
    text.textContent = opts.verdictLabel;
    formula.append(text);

    if (opts.degreeIcons.length > 0) {
      formula.append(doc.createTextNode(" "));
      const iconsWrap = doc.createElement("span");
      iconsWrap.className = "kedom-chat-check__roll-icons";
      iconsWrap.setAttribute("aria-hidden", "true");
      for (const icon of opts.degreeIcons) {
        const el = doc.createElement("i");
        el.className = `fas ${icon.cssClass} kedom-chat-check__degree kedom-chat-check__degree--${icon.kind}`;
        iconsWrap.append(el);
      }
      formula.append(iconsWrap);
    }
  }

  const total = root.querySelector(".dice-total");
  if (total instanceof HTMLElement) {
    total.classList.remove("success", "failure", "cost");
    total.classList.add(opts.panelClass);
  }

  const tooltip =
    root.querySelector(".dice-tooltip .wrapper") ?? root.querySelector(".dice-tooltip");
  if (tooltip instanceof HTMLElement) {
    for (const part of modifierTooltipParts(opts.modifiers ?? [])) {
      const section = doc.createElement("section");
      section.className = "tooltip-part kedom-chat-check__modifier";

      const dice = doc.createElement("div");
      dice.className = "dice";

      const header = doc.createElement("header");
      header.className = "part-header flexrow";

      const partFormula = doc.createElement("span");
      partFormula.className = "part-formula";
      partFormula.textContent = part.formula;
      header.append(partFormula);

      if (part.flavor) {
        const partFlavor = doc.createElement("span");
        partFlavor.className = "part-flavor";
        partFlavor.textContent = part.flavor;
        header.append(partFlavor);
      }

      const partTotal = doc.createElement("span");
      partTotal.className = "part-total";
      partTotal.textContent = String(part.total);
      header.append(partTotal);

      dice.append(header);
      section.append(dice);
      tooltip.append(section);
    }

    if (opts.outcomeSummary) {
      const summary = doc.createElement("div");
      summary.className = "kedom-chat-check__summary";
      summary.textContent = opts.outcomeSummary;
      tooltip.append(summary);
    }
  }

  return root.outerHTML;
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

  const { modifiers, formulaLabel } = prepared;
  const difficulty = DEFAULT_DIFFICULTY;
  const difficultyLabel = localize(
    `KEDOM.DifficultyColumn.${difficulty}`,
    difficulty.charAt(0).toUpperCase() + difficulty.slice(1),
  );
  const formula = labeledCheckFormula(SKILL_CHECK_DICE, formulaLabel, modifiers);
  const roll = await new Roll(formula).evaluate();
  const total = roll.total ?? 0;
  const outcome = resolveOutcome({ total, difficulty });
  const verdict = verdictFor(outcome);
  const icons = degreeIcons(outcome.degree, verdict.iconKind);

  const rollHTML = styleCheckRollHTML(await roll.render(), {
    panelClass: verdict.panelClass,
    verdictLabel: verdict.verdictLabel,
    degreeIcons: icons,
    outcomeSummary: verdict.verdictLabel,
    modifiers,
  });

  const content = await foundry.applications.handlebars.renderTemplate(CHECK_TEMPLATE, {
    outcome,
    rollHTML,
  });

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: actor as Actor.Stored }),
    flavor: game.i18n.format("KEDOM.Chat.SkillCheckFlavor", {
      skill: formulaLabel,
      difficulty: difficultyLabel,
    }),
    content,
    rolls: [roll],
    sound: CONFIG.sounds.dice,
  });
}
