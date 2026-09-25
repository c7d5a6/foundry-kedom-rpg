import {
  bodyPartFromRoll,
  lookupWoundEffectIndex,
  type BodyPartKey,
} from "../config/wound-table.ts";
import type { CharacterData } from "../data/actor/character.ts";
import { formatSignedBonus } from "./build-skill-check.ts";

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
  tableTotal: number;
  luckMod: number;
  ignored: boolean;
};

/**
 * Increment wound count, then roll table (`d20 + Luck mod`) and body part (`d8`).
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

  const lck = (system.abilities as { lck?: { mod?: number } }).lck;
  const luckMod = lck?.mod ?? 0;

  const tableRoll = await new Roll(`1d20 + ${String(luckMod)}`).evaluate();
  const bodyRoll = await new Roll("1d8").evaluate();
  const tableTotal = tableRoll.total ?? 0;
  const bodyDie = bodyRoll.total ?? 1;
  const effectIndex = lookupWoundEffectIndex(tableTotal, woundCount);
  const bodyPart = bodyPartFromRoll(bodyDie);
  const bodyPartLabel = localize(`KEDOM.Wound.BodyPart.${bodyPart}`, bodyPart);

  const content = await foundry.applications.handlebars.renderTemplate(WOUND_TEMPLATE, {
    woundCount,
    effectIndex,
    bodyPart,
    bodyPartLabel,
    tableTotal,
    luckModSigned: formatSignedBonus(luckMod),
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
          luckMod,
          ignored: false,
        } satisfies KedomWoundFlags,
      },
    },
  };
  // @ts-expect-error fvtt-types: kedom system flags are not in the core ChatMessage flag union yet
  await ChatMessage.create(messageData);
}
