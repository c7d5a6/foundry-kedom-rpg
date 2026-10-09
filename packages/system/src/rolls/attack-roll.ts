import type { CharacterData, SkillFields } from "../data/actor/character.ts";
import {
  normalizeWeaponSkill,
  weaponSkillAsSkillKey,
  type WeaponDataFields,
  type WeaponSkillKey,
} from "../data/item/weapon.ts";
import { SKILL_ABILITY, type ProficiencyTier } from "../config/kedom.ts";
import {
  attackBonusTotal,
  attackHits,
  buildAttackModifiers,
  buildDamageModifiers,
} from "./attack-helpers.ts";
import { formatSignedBonus } from "./build-skill-check.ts";
import { styleCheckRollHTML } from "./check-card.ts";
import { labeledCheckFormula } from "./labeled-formula.ts";

const ATTACK_TEMPLATE = "systems/kedom/templates/chat/attack.hbs";

function localize(path: string, fallback: string): string {
  const v = game.i18n.localize(path);
  return !v || v === path ? fallback : v;
}

export type KedomAttackFlags = {
  actorUuid: string;
  weaponUuid: string;
  skillKey: WeaponSkillKey;
  /** Natural d20 face (1–20). */
  d20: number;
  /** Effective total including Luck spent on this card. */
  total: number;
  /** Original dice+mods total before Luck spend. */
  diceTotal: number;
  luckSpent: number;
  targetActorUuid: string | null;
  targetAc: number | null;
  hit: boolean | null;
  isCrit: boolean;
  damageTotal: number | null;
  modifiers: { label: string; value: number }[];
  damageModifiers: { label: string; value: number }[];
};

export function readWeaponSystem(item: Item.Implementation): WeaponDataFields | null {
  // fvtt-types: Item subtypes from system.json are not in the core union yet
  if ((item.type as string) !== "weapon") return null;
  const system = item.system as unknown as WeaponDataFields & { ability?: string };
  return {
    skill: normalizeWeaponSkill(system.skill ?? system.ability),
    damageFormula: system.damageFormula || "1d6",
    attackBonus: Math.floor(system.attackBonus ?? 0),
  };
}

function resolveTargetAc(): { targetActorUuid: string | null; targetAc: number | null } {
  const targets = [...(game.user?.targets ?? [])];
  if (targets.length !== 1) return { targetActorUuid: null, targetAc: null };
  const token = targets[0];
  const actor = token?.actor;
  if (!(actor instanceof Actor)) return { targetActorUuid: null, targetAc: null };
  const combat = (actor.system as CharacterData | undefined)?.combat as
    | { ac?: number }
    | undefined;
  if (typeof combat?.ac !== "number") return { targetActorUuid: null, targetAc: null };
  return { targetActorUuid: actor.uuid ?? null, targetAc: combat.ac };
}

function buildAttackMods(
  actor: Actor.Implementation,
  wsys: WeaponDataFields,
): ReturnType<typeof buildAttackModifiers> | null {
  const skillKey = weaponSkillAsSkillKey(wsys.skill);
  const abilityKey = SKILL_ABILITY[skillKey];
  if (abilityKey === undefined) return null;

  const system = actor.system as CharacterData;
  const ability = (system.abilities as Record<string, { mod?: number }>)[abilityKey];
  const skill = (system.skills as Record<string, SkillFields>)[skillKey];
  if (!ability || !skill) return null;

  const tier = skill.proficiency as ProficiencyTier;
  const proficiencyBonus = Math.trunc(skill.proficiencyBonus ?? 0);
  const attackMod = Math.trunc(skill.attackMod ?? 0);

  const skillLabel = localize(`KEDOM.Skill.${skillKey}`, skillKey);
  const tierLabel = localize(`KEDOM.Proficiency.${tier}`, tier);
  const attackModLabel = game.i18n.format("KEDOM.Weapon.skillAttackMod", { skill: skillLabel });

  return buildAttackModifiers({
    abilityKey,
    abilityLabel: localize(`KEDOM.Ability.${abilityKey}.label`, abilityKey),
    abilityMod: ability.mod ?? 0,
    skillKey,
    skillLabel,
    proficiencyBonus,
    proficiencyLabel: tierLabel,
    attackMod,
    attackModLabel,
    weaponBonus: wsys.attackBonus,
    weaponBonusLabel: localize("KEDOM.Weapon.attackBonus", "Weapon Attack Bonus"),
  });
}

export function buildWeaponDamageModifiers(
  actor: Actor.Implementation,
  wsys: WeaponDataFields,
): ReturnType<typeof buildDamageModifiers> {
  const skillKey = weaponSkillAsSkillKey(wsys.skill);
  const abilityKey = SKILL_ABILITY[skillKey] ?? "mgh";
  const system = actor.system as CharacterData;
  const mightMod = (system.abilities as { mgh?: { mod?: number } }).mgh?.mod ?? 0;
  const meleeDamageBonus = Math.floor(
    ((system.combat as { meleeDamageBonus?: number } | undefined)?.meleeDamageBonus ?? 0),
  );
  const skill = (system.skills as Record<string, SkillFields>)[skillKey];
  const damageMod = Math.trunc(skill?.damageMod ?? 0);
  const skillLabel = localize(`KEDOM.Skill.${skillKey}`, skillKey);

  return buildDamageModifiers({
    abilityKey,
    skillKey,
    mightMod,
    mightLabel: localize("KEDOM.Ability.mgh.label", "Might"),
    meleeDamageBonus,
    meleeDamageLabel: localize("KEDOM.Attributes.meleeDamage", "Melee Damage"),
    damageMod,
    damageModLabel: game.i18n.format("KEDOM.Weapon.skillDamageMod", { skill: skillLabel }),
  });
}

/** Flat totals matching Attack / Damage roll modifiers (sheet button previews). */
export function previewWeaponRollBonuses(
  actor: Actor.Implementation,
  weapon: Item.Implementation,
): { attackBonus: number; damageBonus: number } | null {
  const wsys = readWeaponSystem(weapon);
  if (!wsys) return null;
  const attackMods = buildAttackMods(actor, wsys);
  if (!attackMods) return null;
  return {
    attackBonus: attackBonusTotal(attackMods),
    damageBonus: attackBonusTotal(buildWeaponDamageModifiers(actor, wsys)),
  };
}

async function styleAttackRollHTML(
  roll: Roll,
  opts: {
    hit: boolean | null;
    isCrit: boolean;
    effectiveTotal: number;
    luckSpent: number;
    modifiers: ReadonlyArray<{ label: string; value: number }>;
  },
): Promise<string> {
  const luckLabel = localize("KEDOM.Roll.modifier.luckSpend", "Luck");
  const modifiers =
    opts.luckSpent > 0
      ? [...opts.modifiers, { label: luckLabel, value: opts.luckSpent }]
      : [...opts.modifiers];

  let verdictLabel = game.i18n.localize("KEDOM.Chat.AttackRoll");
  let panelClass: "success" | "failure" | "cost" = "cost";
  if (opts.isCrit) {
    verdictLabel = game.i18n.localize("KEDOM.Chat.AttackCrit");
    panelClass = "success";
  } else if (opts.hit === true) {
    verdictLabel = game.i18n.localize("KEDOM.Chat.AttackHit");
    panelClass = "success";
  } else if (opts.hit === false) {
    verdictLabel = game.i18n.localize("KEDOM.Chat.AttackMiss");
    panelClass = "failure";
  }

  let html = styleCheckRollHTML(await roll.render(), {
    panelClass,
    verdictLabel,
    degreeIcons: [],
    outcomeSummary: verdictLabel,
    modifiers,
  });

  if (opts.effectiveTotal !== (roll.total ?? 0) || opts.luckSpent > 0) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const totalEl = doc.body.querySelector(".dice-total");
    if (totalEl instanceof HTMLElement) totalEl.textContent = String(opts.effectiveTotal);
    const root = doc.body.firstElementChild;
    if (root instanceof HTMLElement) html = root.outerHTML;
  }
  return html;
}

async function styleDamageRollHTML(
  roll: Roll,
  opts: {
    isCrit: boolean;
    modifiers: ReadonlyArray<{ label: string; value: number }>;
  },
): Promise<string> {
  const verdictLabel = opts.isCrit
    ? game.i18n.localize("KEDOM.Chat.DamageCrit")
    : game.i18n.localize("KEDOM.Chat.DamageTotal");
  return styleCheckRollHTML(await roll.render(), {
    panelClass: opts.isCrit ? "success" : "cost",
    verdictLabel,
    degreeIcons: [],
    outcomeSummary: verdictLabel,
    modifiers: opts.modifiers,
  });
}

/**
 * Attack: `1d20 + ability + skill proficiency + skill attack mod + weapon AB`, then damage
 * (maximized on natural 20). Inspectable dice like skill/Luck cards.
 */
export async function rollAttack(
  actor: Actor.Implementation,
  weapon: Item.Implementation,
): Promise<void> {
  const wsys = readWeaponSystem(weapon);
  if (!wsys) {
    ui.notifications.warn(game.i18n.localize("KEDOM.Error.NotAWeapon"));
    return;
  }

  const modifiers = buildAttackMods(actor, wsys);
  if (!modifiers) {
    ui.notifications.error(game.i18n.localize("KEDOM.Chat.MissingSkillData"));
    return;
  }

  const bonus = attackBonusTotal(modifiers);
  const attackFormula = labeledCheckFormula("1d20", weapon.name || "Attack", modifiers);
  const attackRoll = await new Roll(attackFormula).evaluate();
  const diceTotal = attackRoll.total ?? 0;
  const d20Term = attackRoll.dice.find((d) => d.faces === 20);
  const d20 = d20Term?.results?.[0]?.result ?? d20Term?.total ?? 0;
  const isCrit = d20 === 20;

  const { targetActorUuid, targetAc } = resolveTargetAc();
  const hit = attackHits(diceTotal, targetAc);

  const damageMods = buildWeaponDamageModifiers(actor, wsys);
  const damageFormula = labeledCheckFormula(
    wsys.damageFormula,
    weapon.name || "Damage",
    damageMods,
  );
  const damageRoll = isCrit
    ? await new Roll(damageFormula).evaluate({ maximize: true })
    : await new Roll(damageFormula).evaluate();
  const damageTotal = damageRoll.total ?? 0;

  const flags: KedomAttackFlags = {
    actorUuid: actor.uuid ?? "",
    weaponUuid: weapon.uuid ?? "",
    skillKey: wsys.skill,
    d20,
    total: diceTotal,
    diceTotal,
    luckSpent: 0,
    targetActorUuid,
    targetAc,
    hit,
    isCrit,
    damageTotal,
    modifiers: modifiers.map((m) => ({ label: m.label, value: m.value })),
    damageModifiers: damageMods.map((m) => ({ label: m.label, value: m.value })),
  };

  const content = await renderAttackCardContent(flags, [attackRoll, damageRoll]);

  const flavorParts = [
    game.i18n.format("KEDOM.Chat.AttackFlavor", {
      weapon: weapon.name,
      bonus: formatSignedBonus(bonus),
    }),
  ];
  if (hit !== null && targetAc !== null) {
    flavorParts.push(
      game.i18n.format("KEDOM.Chat.AttackVsAc", {
        ac: String(targetAc),
        result: hit
          ? game.i18n.localize("KEDOM.Chat.AttackHit")
          : game.i18n.localize("KEDOM.Chat.AttackMiss"),
      }),
    );
  }
  if (isCrit) {
    flavorParts.push(game.i18n.localize("KEDOM.Chat.AttackCrit"));
  }

  const messageData = {
    speaker: ChatMessage.getSpeaker({ actor: actor as Actor.Stored }),
    flavor: flavorParts.join(" — "),
    content,
    rolls: [attackRoll, damageRoll],
    sound: CONFIG.sounds.dice,
    flags: {
      kedom: {
        attack: flags,
      },
    },
  };
  // @ts-expect-error fvtt-types: kedom system flags are not in the core ChatMessage flag union yet
  await ChatMessage.create(messageData);
}

export async function renderAttackCardContent(
  flags: KedomAttackFlags,
  rolls: Roll[],
): Promise<string> {
  const attackRoll = rolls[0];
  const damageRoll = rolls[1];
  if (!attackRoll) return "";

  const hit = attackHits(flags.total, flags.targetAc);
  const attackRollHTML = await styleAttackRollHTML(attackRoll, {
    hit,
    isCrit: flags.isCrit,
    effectiveTotal: flags.total,
    luckSpent: flags.luckSpent,
    modifiers: flags.modifiers ?? [],
  });

  let damageRollHTML: string | null = null;
  if (damageRoll) {
    damageRollHTML = await styleDamageRollHTML(damageRoll, {
      isCrit: flags.isCrit,
      modifiers: flags.damageModifiers ?? [],
    });
  }

  return foundry.applications.handlebars.renderTemplate(ATTACK_TEMPLATE, {
    attackRollHTML,
    damageRollHTML,
  });
}
