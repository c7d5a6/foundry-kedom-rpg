import { canControlActor, luckPool } from "./card-common.ts";
import { getKedomWoundFlags } from "./wound-flags.ts";
import { updateKedomMessage } from "./message-update.ts";
import type { KedomWoundFlags } from "../actions/wound-roll.ts";

/** Append spend-all-Luck ignore control on wound cards. */
export function decorateWoundCardActions(
  message: ChatMessage.Implementation,
  html: HTMLElement,
): void {
  const flags = getKedomWoundFlags(message);
  if (!flags) return;

  const root = html.querySelector(".kedom-chat-wound");
  if (!(root instanceof HTMLElement)) return;
  if (root.querySelector(".kedom-chat-wound__actions")) return;

  const actor = fromUuidSync(flags.actorUuid);
  if (!(actor instanceof Actor)) return;
  if (!canControlActor(actor)) return;

  const actions = document.createElement("div");
  actions.className = "kedom-chat-wound__actions";

  const pool = luckPool(actor);

  const ignoreBtn = document.createElement("button");
  ignoreBtn.type = "button";
  ignoreBtn.className = "kedom-chat-check__action kedom-chat-wound__action--ignore";
  ignoreBtn.textContent = game.i18n.localize("KEDOM.Chat.IgnoreWound");
  ignoreBtn.disabled = flags.ignored || pool <= 0;
  if (flags.ignored) {
    ignoreBtn.title = game.i18n.localize("KEDOM.Chat.WoundIgnored");
  } else if (pool <= 0) {
    ignoreBtn.title = game.i18n.localize("KEDOM.Chat.IgnoreWoundNoLuck");
  } else {
    ignoreBtn.title = `${ignoreBtn.textContent ?? ""} — ${game.i18n.format("KEDOM.Chat.LuckLeft", { available: String(pool) })}`;
  }
  ignoreBtn.addEventListener("click", () => {
    void onIgnoreWound(message);
  });
  actions.append(ignoreBtn);
  root.append(actions);
}

async function onIgnoreWound(message: ChatMessage.Implementation): Promise<void> {
  const flags = getKedomWoundFlags(message);
  if (!flags || flags.ignored) return;

  const actor = await fromUuid(flags.actorUuid);
  if (!(actor instanceof Actor) || !canControlActor(actor)) return;

  const pool = luckPool(actor);
  if (pool <= 0) {
    ui.notifications.warn(game.i18n.localize("KEDOM.Chat.IgnoreWoundNoLuck"));
    return;
  }

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
  const ok = await updateKedomMessage(message, {
    content,
    flags: { kedom: { wound: updated } },
  });
  if (!ok) {
    ui.notifications.warn(game.i18n.localize("KEDOM.Chat.SpendLuckFailed"));
    return;
  }
  await actor.update({ system: { abilities: { lck: { value: 0 } } } });
}
