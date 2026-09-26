import type { CharacterData } from "../data/actor/character.ts";
import { attackHits, luckCostToHit } from "../rolls/attack-helpers.ts";
import { renderAttackCardContent, rollAttack, type KedomAttackFlags } from "../rolls/attack-roll.ts";
import { rollDamage } from "../rolls/damage-roll.ts";
import { takeWound } from "../rolls/wound-roll.ts";
import { getKedomAttackFlags } from "./attack-flags.ts";

function canControlActor(actor: Actor.Implementation): boolean {
  return Boolean(game.user?.isGM || actor.isOwner);
}

function luckPool(actor: Actor.Implementation): number {
  const system = actor.system as CharacterData;
  const lck = (system.abilities as { lck?: { value?: number } }).lck;
  return Math.max(0, Math.floor(lck?.value ?? 0));
}

/** Append Spend Luck / Roll Damage / Reroll / Critical wound on attack cards. */
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
      : (spendBtn.textContent ?? "");
  spendBtn.addEventListener("click", () => {
    void onSpendLuck(message, spendCost);
  });
  actions.append(spendBtn);

  const damageBtn = document.createElement("button");
  damageBtn.type = "button";
  damageBtn.className = "kedom-chat-check__action kedom-chat-attack__action--damage";
  damageBtn.textContent = game.i18n.localize("KEDOM.Chat.RollDamage");
  damageBtn.addEventListener("click", () => {
    void onRollDamage(flags);
  });
  actions.append(damageBtn);

  const rerollBtn = document.createElement("button");
  rerollBtn.type = "button";
  rerollBtn.className = "kedom-chat-check__action kedom-chat-check__action--reroll";
  rerollBtn.textContent = game.i18n.localize("KEDOM.Chat.Reroll");
  rerollBtn.addEventListener("click", () => {
    void onReroll(flags);
  });
  actions.append(rerollBtn);

  if (flags.isCrit && flags.targetActorUuid) {
    const critBtn = document.createElement("button");
    critBtn.type = "button";
    critBtn.className = "kedom-chat-check__action kedom-chat-attack__action--crit";
    critBtn.textContent = game.i18n.localize("KEDOM.Chat.CriticalWound");
    critBtn.addEventListener("click", () => {
      void onCriticalWound(flags);
    });
    actions.append(critBtn);
  }

  root.append(actions);
}

async function onSpendLuck(message: ChatMessage.Implementation, cost: number): Promise<void> {
  const flags = getKedomAttackFlags(message);
  if (!flags) return;

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

  await actor.update({
    system: { abilities: { lck: { value: pool - cost } } },
  });

  const newTotal = flags.total + cost;
  const hit = attackHits(newTotal, flags.targetAc);
  const updated: KedomAttackFlags = {
    ...flags,
    total: newTotal,
    luckSpent: flags.luckSpent + cost,
    hit,
  };

  const content = await renderAttackCardContent(updated, [...message.rolls]);
  await message.update({
    content,
    flags: {
      kedom: {
        attack: updated,
      },
    },
  } as Parameters<ChatMessage.Implementation["update"]>[0]);
}

async function onRollDamage(flags: KedomAttackFlags): Promise<void> {
  const actor = await fromUuid(flags.actorUuid);
  const weapon = await fromUuid(flags.weaponUuid);
  if (!(actor instanceof Actor) || !canControlActor(actor)) return;
  if (!(weapon instanceof Item)) return;
  await rollDamage(actor, weapon, { maximize: flags.isCrit });
}

async function onReroll(flags: KedomAttackFlags): Promise<void> {
  const actor = await fromUuid(flags.actorUuid);
  const weapon = await fromUuid(flags.weaponUuid);
  if (!(actor instanceof Actor) || !canControlActor(actor)) return;
  if (!(weapon instanceof Item)) return;
  await rollAttack(actor, weapon);
}

async function onCriticalWound(flags: KedomAttackFlags): Promise<void> {
  if (!flags.targetActorUuid) return;
  const target = await fromUuid(flags.targetActorUuid);
  if (!(target instanceof Actor)) return;
  if (!canControlActor(target) && !game.user?.isGM) {
    ui.notifications.warn(game.i18n.localize("KEDOM.Chat.CriticalWoundNoPermission"));
    return;
  }
  await takeWound(target);
}
