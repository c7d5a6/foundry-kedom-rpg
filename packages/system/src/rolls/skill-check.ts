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
import { collectSkillCheckModifiers, type Modifier } from "./collectors.ts";
import { resolveOutcome } from "./resolve-outcome.ts";

function localize(path: string, fallback: string): string {
  const v = game.i18n.localize(path);
  return !v || v === path ? fallback : v;
}

function outcomeLabel(outcome: GradedOutcome): string {
  if (outcome.kind === "cost") {
    return localize("KEDOM.Outcome.cost", "Success at a Cost");
  }
  return game.i18n.format(`KEDOM.Outcome.${outcome.kind}`, {
    degree: outcome.degree,
  });
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

  const modTerms = modifiers.map((m) => (m.value >= 0 ? `+ ${m.value}` : `- ${Math.abs(m.value)}`));
  const formula = [SKILL_CHECK_DICE, ...modTerms].join(" ");
  const roll = await new Roll(formula).evaluate();
  const total = roll.total ?? 0;
  const column = DEFAULT_DIFFICULTY;
  const outcome = resolveOutcome({ total, difficulty: column });
  const labeled = outcomeLabel(outcome);

  const diceTerm = roll.terms.find((t) => "results" in t);
  const diceTotal =
    diceTerm && "total" in diceTerm && typeof diceTerm.total === "number"
      ? diceTerm.total
      : undefined;

  const content = renderCheckCard({
    actorName: actor.name ?? "Character",
    skillLabel,
    formula: roll.formula,
    diceTotal,
    modifiers,
    total,
    outcomeLabel: labeled,
  });

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: actor as Actor.Stored }),
    flavor: skillLabel,
    content,
    rolls: [roll],
    sound: CONFIG.sounds.dice,
  });
}

function renderCheckCard(opts: {
  actorName: string;
  skillLabel: string;
  formula: string;
  diceTotal: number | undefined;
  modifiers: Modifier[];
  total: number;
  outcomeLabel: string;
}): string {
  const mods = opts.modifiers
    .map(
      (m) =>
        `<li><strong>${m.value >= 0 ? `+${m.value}` : m.value}</strong> ${m.label} <em>(${m.source.label})</em></li>`,
    )
    .join("");
  const dice = opts.diceTotal !== undefined ? String(opts.diceTotal) : "?";
  const diceLabel = game.i18n.localize("KEDOM.Chat.Dice");
  const totalLabel = game.i18n.localize("KEDOM.Chat.Total");
  return `
    <div class="kedom-chat-check">
      <div><strong>${opts.actorName}</strong> — ${opts.skillLabel}</div>
      <div class="formula">${opts.formula}</div>
      <ul class="mods">
        <li>${dice} (${diceLabel})</li>
        ${mods}
      </ul>
      <div class="total">${totalLabel} ${opts.total} — ${opts.outcomeLabel}</div>
    </div>
  `;
}
