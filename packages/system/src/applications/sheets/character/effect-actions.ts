import type { SheetHost } from "./helpers.ts";

export async function onCreateActorEffect(this: SheetHost): Promise<void> {
  if (!this.isEditable || !this.actor) return;
  const created = await this.actor.createEmbeddedDocuments("ActiveEffect", [
    {
      name: game.i18n.localize("KEDOM.Sheet.NewEffect"),
      img: "icons/svg/aura.svg",
      transfer: false,
      origin: this.actor.uuid,
      disabled: false,
      changes: [],
    },
  ]);
  const effect = Array.isArray(created) ? created[0] : created;
  if (effect) await effect.sheet?.render(true);
}

function findApplicableEffect(
  sheet: SheetHost,
  effectId: string,
): ActiveEffect.Implementation | undefined {
  for (const effect of sheet.actor.allApplicableEffects()) {
    if (effect.id === effectId) return effect;
  }
  return undefined;
}

export async function onEditEffect(
  this: SheetHost,
  _event: PointerEvent,
  target: HTMLElement,
): Promise<void> {
  const effectId = target.dataset.effectId;
  if (!effectId) return;
  const effect = findApplicableEffect(this, effectId);
  if (!effect) return;
  const parent = effect.parent;
  if (parent && parent !== this.actor && "sheet" in parent) {
    await (parent as Item.Implementation).sheet?.render(true);
    return;
  }
  await effect.sheet?.render(true);
}

export async function onDeleteEffect(
  this: SheetHost,
  _event: PointerEvent,
  target: HTMLElement,
): Promise<void> {
  if (!this.isEditable || !this.actor) return;
  const effectId = target.dataset.effectId;
  if (!effectId) return;
  const effect = this.actor.effects.get(effectId);
  if (!effect) {
    ui.notifications.warn(game.i18n.localize("KEDOM.Sheet.EffectDeleteFromItem"));
    return;
  }
  const confirmed = await foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize("KEDOM.Sheet.Action.deleteEffect") },
    content: `<p>${game.i18n.format("KEDOM.Sheet.DeleteEffectConfirm", {
      name: effect.name,
    })}</p>`,
  });
  if (!confirmed) return;
  await effect.delete();
}

export async function onToggleEffect(
  this: SheetHost,
  _event: PointerEvent,
  target: HTMLElement,
): Promise<void> {
  if (!this.isEditable) return;
  const effectId = target.dataset.effectId;
  if (!effectId) return;
  const effect = findApplicableEffect(this, effectId);
  if (!effect) return;
  await effect.update({ disabled: !effect.disabled });
}

export async function onOpenEffectSource(
  this: SheetHost,
  _event: PointerEvent,
  target: HTMLElement,
): Promise<void> {
  const itemId = target.dataset.itemId;
  if (!itemId || !this.actor) return;
  const item = this.actor.items.get(itemId);
  if (!item) return;
  await item.sheet?.render(true);
}
