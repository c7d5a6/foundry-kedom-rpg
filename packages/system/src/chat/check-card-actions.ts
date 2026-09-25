import type { SaveKey, SkillKey } from "../config/kedom.ts";
import type { CharacterData } from "../data/actor/character.ts";
import { renderGradedCheckContent } from "../rolls/check-card.ts";
import { luckCostToNextOutcome } from "../rolls/luck-spend.ts";
import { rollLuckSave } from "../rolls/luck-save.ts";
import { resolveOutcome } from "../rolls/resolve-outcome.ts";
import { rollSaveCheck } from "../rolls/save-check.ts";
import { rollSkillCheck } from "../rolls/skill-check.ts";
import { getKedomCheckFlags, type KedomGradedCheckFlags } from "./check-flags.ts";

function canControlActor(actor: Actor.Implementation): boolean {
  return Boolean(game.user?.isGM || actor.isOwner);
}

function luckPool(actor: Actor.Implementation): number {
  const system = actor.system as CharacterData;
  const lck = (system.abilities as { lck?: { value?: number } }).lck;
  return Math.max(0, Math.floor(lck?.value ?? 0));
}

function localizeOutcome(outcome: { kind: string }): string {
  const path = `KEDOM.Outcome.${outcome.kind}`;
  const v = game.i18n.localize(path);
  return !v || v === path ? outcome.kind : v;
}

/** Append Spend / Reroll controls on graded check cards. */
export function decorateCheckCardActions(
  message: ChatMessage.Implementation,
  html: HTMLElement,
): void {
  const flags = getKedomCheckFlags(message);
  if (!flags) return;

  const root = html.querySelector(".kedom-chat-check");
  if (!(root instanceof HTMLElement)) return;
  if (root.querySelector(".kedom-chat-check__actions")) return;

  const actor = fromUuidSync(flags.actorUuid);
  if (!(actor instanceof Actor)) return;
  if (!canControlActor(actor)) return;

  const actions = document.createElement("div");
  actions.className = "kedom-chat-check__actions";

  const allowSpend = flags.kind === "skill" || flags.kind === "save";
  const next = allowSpend ? luckCostToNextOutcome(flags.total, flags.difficulty) : null;
  const pool = luckPool(actor);
  if (next) {
    const spendBtn = document.createElement("button");
    spendBtn.type = "button";
    spendBtn.className = "kedom-chat-check__action kedom-chat-check__action--spend";
    spendBtn.textContent = game.i18n.format("KEDOM.Chat.SpendLuck", {
      cost: String(next.cost),
      outcome: localizeOutcome(next.nextOutcome),
    });
    spendBtn.disabled = pool < next.cost;
    spendBtn.title =
      pool < next.cost
        ? game.i18n.format("KEDOM.Chat.InsufficientLuck", {
            cost: String(next.cost),
            available: String(pool),
          })
        : (spendBtn.textContent ?? "");
    spendBtn.addEventListener("click", () => {
      void onSpendLuck(message, next.cost);
    });
    actions.append(spendBtn);
  }

  const rerollBtn = document.createElement("button");
  rerollBtn.type = "button";
  rerollBtn.className = "kedom-chat-check__action kedom-chat-check__action--reroll";
  rerollBtn.textContent = game.i18n.localize("KEDOM.Chat.Reroll");
  rerollBtn.addEventListener("click", () => {
    void onReroll(flags);
  });
  actions.append(rerollBtn);

  root.append(actions);
}

async function onSpendLuck(message: ChatMessage.Implementation, cost: number): Promise<void> {
  const flags = getKedomCheckFlags(message);
  if (!flags || flags.kind === "luck-save") return;

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

  const expected = luckCostToNextOutcome(flags.total, flags.difficulty);
  if (!expected || expected.cost !== cost) {
    ui.notifications.warn(game.i18n.localize("KEDOM.Chat.SpendLuckStale"));
    return;
  }

  await actor.update({
    system: { abilities: { lck: { value: pool - cost } } },
  });

  const newTotal = flags.total + cost;
  const newLuckSpent = flags.luckSpent + cost;
  const outcome = resolveOutcome({ total: newTotal, difficulty: flags.difficulty });
  const roll = message.rolls[0];
  if (!roll) return;

  const content = await renderGradedCheckContent({
    roll,
    outcome,
    modifiers: flags.modifiers ?? [],
    effectiveTotal: newTotal,
    luckSpent: newLuckSpent,
  });

  const updatedFlags: KedomGradedCheckFlags = {
    ...flags,
    total: newTotal,
    luckSpent: newLuckSpent,
  };

  await message.update({
    content,
    flags: {
      kedom: {
        check: updatedFlags,
      },
    },
  } as Parameters<ChatMessage.Implementation["update"]>[0]);
}

async function onReroll(flags: KedomGradedCheckFlags): Promise<void> {
  const actor = await fromUuid(flags.actorUuid);
  if (!(actor instanceof Actor) || !canControlActor(actor)) return;

  const opts = {
    configure: false as const,
    difficulty: flags.difficulty,
    advantageNet: flags.advantageNet,
    situational: flags.situational,
  };

  if (flags.kind === "skill" && flags.skillKey) {
    const skillOpts =
      flags.specializationSlug !== undefined
        ? { ...opts, specializationSlug: flags.specializationSlug }
        : opts;
    await rollSkillCheck(actor, flags.skillKey as SkillKey, skillOpts);
    return;
  }

  if (flags.kind === "save" && flags.saveKey) {
    await rollSaveCheck(actor, flags.saveKey as SaveKey, opts);
    return;
  }

  if (flags.kind === "luck-save") {
    await rollLuckSave(actor, opts);
  }
}
