import { buildWeaponDamageModifiers, readWeaponSystem } from "./attack-roll.ts";
import { styleCheckRollHTML } from "./check-card.ts";
import { labeledCheckFormula } from "./labeled-formula.ts";
import type { WeaponSkillKey } from "../data/item/weapon.ts";

const DAMAGE_TEMPLATE = "systems/kedom/templates/chat/damage.hbs";

export type KedomDamageFlags = {
  actorUuid: string;
  weaponUuid: string;
  skillKey: WeaponSkillKey;
  total: number;
  isCrit: boolean;
  modifiers: { label: string; value: number }[];
};

/**
 * Standalone damage roll (Combat tab Damage button).
 * Pass `maximize: true` for critical max dice.
 */
export async function rollDamage(
  actor: Actor.Implementation,
  weapon: Item.Implementation,
  options: { maximize?: boolean } = {},
): Promise<void> {
  const wsys = readWeaponSystem(weapon);
  if (!wsys) {
    ui.notifications.warn(game.i18n.localize("KEDOM.Error.NotAWeapon"));
    return;
  }

  const modifiers = buildWeaponDamageModifiers(actor, wsys);
  const formula = labeledCheckFormula(
    wsys.damageFormula,
    weapon.name || "Damage",
    modifiers,
  );
  const roll = options.maximize
    ? await new Roll(formula).evaluate({ maximize: true })
    : await new Roll(formula).evaluate();
  const total = roll.total ?? 0;
  const isCrit = Boolean(options.maximize);

  const rollHTML = styleCheckRollHTML(await roll.render(), {
    panelClass: isCrit ? "success" : "cost",
    verdictLabel: isCrit
      ? game.i18n.localize("KEDOM.Chat.DamageCrit")
      : game.i18n.localize("KEDOM.Chat.DamageTotal"),
    degreeIcons: [],
    outcomeSummary: "",
    modifiers,
  });

  const content = await foundry.applications.handlebars.renderTemplate(DAMAGE_TEMPLATE, {
    rollHTML,
  });

  const flags: KedomDamageFlags = {
    actorUuid: actor.uuid ?? "",
    weaponUuid: weapon.uuid ?? "",
    skillKey: wsys.skill,
    total,
    isCrit,
    modifiers: modifiers.map((m) => ({ label: m.label, value: m.value })),
  };

  const messageData = {
    speaker: ChatMessage.getSpeaker({ actor: actor as Actor.Stored }),
    flavor: game.i18n.format("KEDOM.Chat.DamageFlavor", {
      weapon: weapon.name,
      total: String(total),
    }),
    content,
    rolls: [roll],
    sound: CONFIG.sounds.dice,
    flags: {
      kedom: {
        damage: flags,
      },
    },
  };
  // @ts-expect-error fvtt-types: kedom system flags are not in the core ChatMessage flag union yet
  await ChatMessage.create(messageData);
}
