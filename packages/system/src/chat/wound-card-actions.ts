import type { CharacterData } from "../data/actor/character.ts";
import type { KedomWoundFlags } from "../rolls/wound-roll.ts";

function canControlActor(actor: Actor.Implementation): boolean {
  return Boolean(game.user?.isGM || actor.isOwner);
}

function getWoundFlags(message: ChatMessage.Implementation): KedomWoundFlags | null {
  const flags = message.flags as { kedom?: { wound?: KedomWoundFlags } } | undefined;
  const wound = flags?.kedom?.wound;
  if (!wound || typeof wound.actorUuid !== "string") return null;
  return wound;
}

/** Append spend-all-Luck ignore control on wound cards. */
export function decorateWoundCardActions(
  message: ChatMessage.Implementation,
  html: HTMLElement,
): void {
  const flags = getWoundFlags(message);
  if (!flags) return;

  const root = html.querySelector(".kedom-chat-wound");
  if (!(root instanceof HTMLElement)) return;
  if (root.querySelector(".kedom-chat-wound__actions")) return;

  const actor = fromUuidSync(flags.actorUuid);
  if (!(actor instanceof Actor)) return;
  if (!canControlActor(actor)) return;

  const actions = document.createElement("div");
  actions.className = "kedom-chat-wound__actions";

  const luck =
    ((actor.system as CharacterData).abilities as { lck?: { value?: number } }).lck?.value ?? 0;
  const pool = Math.max(0, Math.floor(luck));

  const ignoreBtn = document.createElement("button");
  ignoreBtn.type = "button";
  ignoreBtn.className = "kedom-chat-check__action kedom-chat-wound__action--ignore";
  ignoreBtn.textContent = game.i18n.localize("KEDOM.Chat.IgnoreWound");
  ignoreBtn.disabled = flags.ignored || pool <= 0;
  if (flags.ignored) {
    ignoreBtn.title = game.i18n.localize("KEDOM.Chat.WoundIgnored");
  } else if (pool <= 0) {
    ignoreBtn.title = game.i18n.localize("KEDOM.Chat.IgnoreWoundNoLuck");
  }
  ignoreBtn.addEventListener("click", () => {
    void onIgnoreWound(message);
  });
  actions.append(ignoreBtn);
  root.append(actions);
}

async function onIgnoreWound(message: ChatMessage.Implementation): Promise<void> {
  const flags = getWoundFlags(message);
  if (!flags || flags.ignored) return;

  const actor = await fromUuid(flags.actorUuid);
  if (!(actor instanceof Actor) || !canControlActor(actor)) return;

  const luck =
    ((actor.system as CharacterData).abilities as { lck?: { value?: number } }).lck?.value ?? 0;
  const pool = Math.max(0, Math.floor(luck));
  if (pool <= 0) {
    ui.notifications.warn(game.i18n.localize("KEDOM.Chat.IgnoreWoundNoLuck"));
    return;
  }

  await actor.update({ system: { abilities: { lck: { value: 0 } } } });

  const bodyPartLabel = game.i18n.localize(`KEDOM.Wound.BodyPart.${flags.bodyPart}`);
  const tableRow = flags.tableRow ?? flags.tableTotal;
  const content = await foundry.applications.handlebars.renderTemplate(
    "systems/kedom/templates/chat/wound.hbs",
    {
      woundCount: flags.woundCount,
      effectIndex: flags.effectIndex,
      bodyPart: flags.bodyPart,
      bodyPartLabel,
      tableTotal: flags.tableTotal,
      tableRow,
      tableClamped: tableRow !== flags.tableTotal,
      luckModSigned: flags.luckMod >= 0 ? `+${String(flags.luckMod)}` : String(flags.luckMod),
      armorBonusSigned:
        (flags.armorBonus ?? 0) !== 0
          ? flags.armorBonus >= 0
            ? `+${String(flags.armorBonus)}`
            : String(flags.armorBonus)
          : "",
      modifiers: flags.modifiers ?? [],
      ignored: true,
    },
  );

  const updated: KedomWoundFlags = { ...flags, ignored: true };
  await message.update({
    content,
    flags: {
      kedom: {
        wound: updated,
      },
    },
  } as Parameters<ChatMessage.Implementation["update"]>[0]);
}
