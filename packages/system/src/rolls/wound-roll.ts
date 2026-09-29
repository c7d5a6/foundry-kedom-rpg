import { PROFICIENCY_BONUS, type ProficiencyTier } from "../config/kedom.ts";
import { ownedArmorWoundBonus } from "../data/item/armor.ts";
import {
  bodyPartFromRoll,
  clampWoundTableTotal,
  lookupWoundEffectIndex,
  type BodyPartKey,
} from "../config/wound-table.ts";
import type { CharacterData, SaveFields } from "../data/actor/character.ts";
import { formatSignedBonus } from "./build-skill-check.ts";
import { labeledCheckFormula } from "./labeled-formula.ts";
import type { Modifier } from "./collectors.ts";

const WOUND_TEMPLATE = "systems/kedom/templates/chat/wound.hbs";

function localize(path: string, fallback: string): string {
  const v = game.i18n.localize(path);
  return !v || v === path ? fallback : v;
}

export type KedomWoundFlags = {
  actorUuid: string;
  woundCount: number;
  effectIndex: number;
  bodyPart: BodyPartKey;
  /** Raw luck-save total before table clamp. */
  tableTotal: number;
  /** Total used for the wound table (−3…30). */
  tableRow: number;
  luckMod: number;
  armorBonus: number;
  modifiers: { label: string; value: number }[];
  ignored: boolean;
};

/**
 * Increment wound count, then roll a Luck save (`d20` + Luck mod + Luck proficiency +
 * owned armor wound bonuses) for the wound table, plus body part (`d8`).
 */
export async function takeWound(actor: Actor.Implementation): Promise<void> {
  const system = actor.system as CharacterData;
  const attrs = system.attributes as {
    wounds?: { value?: number };
  };
  const current = Math.max(0, Math.floor(attrs.wounds?.value ?? 0));
  const woundCount = current + 1;

  await actor.update({
    system: { attributes: { wounds: { value: woundCount } } },
  });

  const save = system.saves.luck as SaveFields | undefined;
  const lck = (system.abilities as { lck?: { mod?: number } }).lck;
  const luckMod = lck?.mod ?? 0;
  const tier = (save?.proficiency ?? "untrained") as ProficiencyTier;
  const profBonus = PROFICIENCY_BONUS[tier] ?? 0;
  const armorBonus = ownedArmorWoundBonus(actor);

  const abilityLabel = localize("KEDOM.Ability.lck.label", "Luck");
  const tierLabel = localize(`KEDOM.Proficiency.${tier}`, tier);
  const armorLabel = localize("KEDOM.Armor.woundBonus", "Armor");

  const modifiers: Modifier[] = [
    {
      label: abilityLabel,
      value: luckMod,
      source: { id: "ability.lck", label: abilityLabel },
      kind: "ability",
    },
    {
      label: tierLabel,
      value: profBonus,
      source: { id: "save.luck.proficiency", label: tierLabel },
      kind: "skill",
    },
  ];
  if (armorBonus !== 0) {
    modifiers.push({
      label: armorLabel,
      value: armorBonus,
      source: { id: "armor.woundBonus", label: armorLabel },
      kind: "armor",
    });
  }

  const saveLabel = localize("KEDOM.Save.luck", "Luck");
  const formula = labeledCheckFormula("1d20", saveLabel, modifiers);
  const tableRoll = await new Roll(formula).evaluate();
  const bodyRoll = await new Roll("1d8").evaluate();
  const tableTotal = tableRoll.total ?? 0;
  const tableRow = clampWoundTableTotal(tableTotal);
  const bodyDie = bodyRoll.total ?? 1;
  const effectIndex = lookupWoundEffectIndex(tableRow, woundCount);
  const bodyPart = bodyPartFromRoll(bodyDie);
  const bodyPartLabel = localize(`KEDOM.Wound.BodyPart.${bodyPart}`, bodyPart);

  const modSummaries = modifiers
    .filter((m) => m.value !== 0)
    .map((m) => ({ label: m.label, value: m.value }));

  const content = await foundry.applications.handlebars.renderTemplate(WOUND_TEMPLATE, {
    woundCount,
    effectIndex,
    bodyPart,
    bodyPartLabel,
    tableTotal,
    tableRow,
    tableClamped: tableRow !== tableTotal,
    luckModSigned: formatSignedBonus(luckMod),
    armorBonusSigned: armorBonus !== 0 ? formatSignedBonus(armorBonus) : "",
    modifiers: modSummaries,
    ignored: false,
  });

  const messageData = {
    speaker: ChatMessage.getSpeaker({ actor: actor as Actor.Stored }),
    flavor: game.i18n.format("KEDOM.Chat.WoundFlavor", {
      count: String(woundCount),
      effect: String(effectIndex),
      part: bodyPartLabel,
    }),
    content,
    rolls: [tableRoll, bodyRoll],
    sound: CONFIG.sounds.dice,
    flags: {
      kedom: {
        wound: {
          actorUuid: actor.uuid ?? "",
          woundCount,
          effectIndex,
          bodyPart,
          tableTotal,
          tableRow,
          luckMod,
          armorBonus,
          modifiers: modSummaries,
          ignored: false,
        } satisfies KedomWoundFlags,
      },
    },
  };
  // @ts-expect-error fvtt-types: kedom system flags are not in the core ChatMessage flag union yet
  await ChatMessage.create(messageData);
}
