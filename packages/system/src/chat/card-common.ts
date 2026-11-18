import { characterData } from "../types/accessors.ts";

/** GMs and the actor's owners may use the buttons on that actor's cards. */
export function canControlActor(actor: Actor.Implementation): boolean {
  // game.user is unset until Foundry finishes loading the session; the types claim otherwise.
  const user = game.user as User.Implementation | null | undefined;
  return user?.isGM === true || actor.isOwner;
}

/** Whole Luck points the actor can currently spend (Luck current value, never negative). */
export function luckPool(actor: Actor.Implementation): number {
  const lck = (characterData(actor).abilities as { lck?: { value?: number } }).lck;
  return Math.max(0, Math.floor(lck?.value ?? 0));
}

/** Narrow a looked-up document to an Actor.Implementation (`instanceof Actor` yields `Actor<any>`). */
export function asActor(doc: unknown): Actor.Implementation | undefined {
  return doc instanceof Actor ? (doc as Actor.Implementation) : undefined;
}

/** Narrow a looked-up document to an Item.Implementation (`instanceof Item` yields `Item<any>`). */
export function asItem(doc: unknown): Item.Implementation | undefined {
  return doc instanceof Item ? (doc as Item.Implementation) : undefined;
}

/** Muted "Rerolled" marker shown in place of the action buttons on a superseded card. */
export function rerolledNote(className: string): HTMLElement {
  const note = document.createElement("div");
  note.className = className;
  const label = document.createElement("span");
  label.className = "kedom-chat-check__rerolled";
  label.textContent = game.i18n.localize("KEDOM.Chat.Rerolled");
  note.append(label);
  return note;
}

/** Rerolling abandons Luck already spent on the card; ask first when there is any. */
export async function confirmReroll(luckSpent: number): Promise<boolean> {
  if (luckSpent <= 0) return true;
  const confirmed = await foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize("KEDOM.Chat.Reroll") },
    content: `<p>${game.i18n.format("KEDOM.Chat.RerollConfirm", { spent: String(luckSpent) })}</p>`,
  });
  return confirmed === true;
}
