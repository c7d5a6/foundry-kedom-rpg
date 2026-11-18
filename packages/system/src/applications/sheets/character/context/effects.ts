import { collate } from "./shared.ts";

/** Effect icons may be null or blank at runtime; fall back to the default aura icon. */
function effectImage(img: string | null | undefined): string {
  return img !== undefined && img !== null && img !== "" ? img : "icons/svg/aura.svg";
}

/** Actor-owned vs item-sourced effects. Empty off the effects tab. */
export function buildEffects(actor: Actor.Implementation, enabled: boolean) {
  const actorEffects: {
    id: string;
    name: string;
    img: string;
    disabled: boolean;
    sourceName: string;
    parentIsActor: boolean;
    parentItemId: string | null;
  }[] = [];
  const itemEffects: typeof actorEffects = [];
  for (const effect of enabled ? actor.allApplicableEffects() : []) {
    const parent = effect.parent;
    const parentIsActor = parent === actor;
    const parentItem =
      !parentIsActor && parent && "documentName" in parent && parent.documentName === "Item"
        ? parent
        : null;
    const row = {
      // Unsaved effects have no id at runtime; the declared type says string.
      id: (effect.id as string | null | undefined) ?? "",
      name: effect.name,
      img: effectImage(effect.img),
      disabled: effect.disabled,
      sourceName: parentItem?.name ?? (effect as { sourceName?: string }).sourceName ?? "",
      parentIsActor,
      parentItemId: parentItem?.id ?? null,
    };
    if (!row.id) continue;
    if (parentIsActor) actorEffects.push(row);
    else itemEffects.push(row);
  }
  const byDisabledThenName = (a: (typeof actorEffects)[number], b: (typeof actorEffects)[number]) =>
    Number(a.disabled) - Number(b.disabled) || collate(a.name, b.name);
  actorEffects.sort(byDisabledThenName);
  itemEffects.sort(byDisabledThenName);
  return { actorEffects, itemEffects };
}
