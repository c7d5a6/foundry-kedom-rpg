import { canControlActor, confirmReroll, luckPool, rerolledNote } from "./card-common.ts";
import { attackHits, luckCostToHit } from "../rolls/attack-helpers.ts";
import {
  renderAttackCardContent,
  rollAttack,
  type KedomAttackFlags,
} from "../actions/attack-roll.ts";
import { takeWound } from "../actions/wound-roll.ts";
import { updateKedomMessage } from "./message-update.ts";
import { getKedomAttackFlags } from "./attack-flags.ts";

/** Append Spend Luck / Reroll / Critical wound on attack cards. */
export function decorateAttackCardActions(
  message: ChatMessage.Implementation,
  html: HTMLElement,
): void {
  const flags = getKedomAttackFlags(message);
  if (!flags) return;

  const root = html.querySelector(".kedom-chat-attack");
  if (!(root instanceof HTMLElement)) return;
  if (root.querySelector(".kedom-chat-attack__actions")) return;

  const actor = fromUuidSync(flags.actorUuid);
  if (!(actor instanceof Actor)) return;
  if (!canControlActor(actor)) return;

  if (flags.rerolled) {
    root.append(rerolledNote("kedom-chat-check__actions kedom-chat-attack__actions"));
    return;
  }

  const actions = document.createElement("div");
  actions.className = "kedom-chat-check__actions kedom-chat-attack__actions";

  const pool = luckPool(actor);
  const toHit = luckCostToHit(flags.total, flags.targetAc);
  const spendCost = toHit ?? 1;
  const spendBtn = document.createElement("button");
  spendBtn.type = "button";
  spendBtn.className = "kedom-chat-check__action kedom-chat-check__action--spend";
  spendBtn.textContent =
    toHit !== null
      ? game.i18n.format("KEDOM.Chat.SpendLuckToHit", { cost: String(toHit) })
      : game.i18n.format("KEDOM.Chat.SpendLuckPlusOne", { cost: "1" });
  spendBtn.disabled = pool < spendCost;
  spendBtn.title =
    pool < spendCost
      ? game.i18n.format("KEDOM.Chat.InsufficientLuck", {
          cost: String(spendCost),
          available: String(pool),
        })
      : `${spendBtn.textContent ?? ""} — ${game.i18n.format("KEDOM.Chat.LuckLeft", { available: String(pool) })}`;
  spendBtn.addEventListener("click", () => {
    void onSpendLuck(message, spendCost);
  });
  actions.append(spendBtn);

  const rerollBtn = document.createElement("button");
  rerollBtn.type = "button";
  rerollBtn.className = "kedom-chat-check__action kedom-chat-check__action--reroll";
  rerollBtn.textContent = game.i18n.localize("KEDOM.Chat.Reroll");
  rerollBtn.addEventListener("click", () => {
    rerollBtn.disabled = true;
    void onReroll(message).finally(() => {
      rerollBtn.disabled = false;
    });
  });
  actions.append(rerollBtn);

  if (flags.isCrit && flags.targetActorUuid) {
    const critBtn = document.createElement("button");
    critBtn.type = "button";
    critBtn.className = "kedom-chat-check__action kedom-chat-attack__action--crit";
    critBtn.textContent = game.i18n.localize("KEDOM.Chat.CriticalWound");
    critBtn.disabled = flags.critWoundApplied === true;
    critBtn.addEventListener("click", () => {
      void onCriticalWound(message);
    });
    actions.append(critBtn);
  }

  root.append(actions);
}

async function onSpendLuck(message: ChatMessage.Implementation, cost: number): Promise<void> {
  const flags = getKedomAttackFlags(message);
  if (!flags || flags.rerolled) return;

  const actor = await fromUuid(flags.actorUuid);
  if (!(actor instanceof Actor) || !canControlActor(actor)) return;

  const pool = luckPool(actor);
  if (pool < cost) {
    ui.notifications.warn(
      game.i18n.format("KEDOM.Chat.InsufficientLuck", {
        cost: String(cost),
        available: String(pool),
      }),
    );
    return;
  }

  const expected = luckCostToHit(flags.total, flags.targetAc) ?? 1;
  if (expected !== cost) {
    ui.notifications.warn(game.i18n.localize("KEDOM.Chat.SpendLuckStale"));
    return;
  }

  const newTotal = flags.total + cost;
  const hit = attackHits(newTotal, flags.targetAc);
  const updated: KedomAttackFlags = {
    ...flags,
    total: newTotal,
    luckSpent: flags.luckSpent + cost,
    hit,
  };

  const content = await renderAttackCardContent(updated, [...message.rolls]);
  const ok = await updateKedomMessage(message, {
    content,
    flags: { kedom: { attack: updated } },
  });
  if (!ok) {
    ui.notifications.warn(game.i18n.localize("KEDOM.Chat.SpendLuckFailed"));
    return;
  }
  await actor.update({
    system: { abilities: { lck: { value: pool - cost } } },
  });
}

async function onReroll(message: ChatMessage.Implementation): Promise<void> {
  const flags = getKedomAttackFlags(message);
  if (!flags || flags.rerolled) return;
  const actor = await fromUuid(flags.actorUuid);
  const weapon = await fromUuid(flags.weaponUuid);
  if (!(actor instanceof Actor) || !canControlActor(actor)) return;
  if (!(weapon instanceof Item)) return;
  if (!(await confirmReroll(flags.luckSpent))) return;
  await rollAttack(actor, weapon);
  // Roll first, then retire the old card, so a failed roll does not strand it.
  await updateKedomMessage(message, { flags: { kedom: { attack: { ...flags, rerolled: true } } } });
}

async function onCriticalWound(message: ChatMessage.Implementation): Promise<void> {
  const flags = getKedomAttackFlags(message);
  if (!flags?.targetActorUuid || flags.critWoundApplied === true) return;
  const target = await fromUuid(flags.targetActorUuid);
  if (!(target instanceof Actor)) return;
  if (!canControlActor(target)) {
    ui.notifications.warn(game.i18n.localize("KEDOM.Chat.CriticalWoundNoPermission"));
    return;
  }
  // Mark first so a second click (or another client) cannot apply it again.
  const updated: KedomAttackFlags = { ...flags, critWoundApplied: true };
  const ok = await updateKedomMessage(message, { flags: { kedom: { attack: updated } } });
  if (!ok) return;
  await takeWound(target);
}
