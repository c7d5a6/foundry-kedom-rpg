import { openSheet } from "../../open-sheet.ts";
import { postArtUseChat } from "../../../chat/art-card.ts";
import type { ArtDataFields } from "../../../data/item/art.ts";
import { summarizeActorEffort } from "../../../derivations/actor-effort.ts";
import { systemOf } from "../../../types/accessors.ts";
import type { SheetHost } from "./helpers.ts";

export async function onCreateTalent(this: SheetHost): Promise<void> {
  if (!this.isEditable) return;
  const created = await this.actor.createEmbeddedDocuments("Item", [
    {
      name: game.i18n.localize("KEDOM.Talent.NewTalent"),
      // @ts-expect-error fvtt-types: talent Item subtype
      type: "talent",
      img: "icons/svg/upgrade.svg",
      system: {
        description: "",
        grants: { skills: [], specializations: [], abilities: [] },
      },
    },
  ]);
  const item = Array.isArray(created) ? created[0] : created;
  if (item) await openSheet(item);
}

async function createOwnedItem(
  sheet: SheetHost,
  type: "weapon" | "armor" | "art",
  nameKey: string,
): Promise<void> {
  if (!sheet.isEditable) return;
  const created = await sheet.actor.createEmbeddedDocuments("Item", [
    // @ts-expect-error fvtt-types: Item subtypes from system.json are not augmented yet
    { name: game.i18n.localize(nameKey), type },
  ]);
  const item = Array.isArray(created) ? created[0] : created;
  if (item) await openSheet(item);
}

export async function onCreateWeapon(this: SheetHost): Promise<void> {
  await createOwnedItem(this, "weapon", "KEDOM.Sheet.NewWeapon");
}

export async function onCreateArmor(this: SheetHost): Promise<void> {
  await createOwnedItem(this, "armor", "KEDOM.Sheet.NewArmor");
}

export async function onCreateArt(this: SheetHost): Promise<void> {
  await createOwnedItem(this, "art", "KEDOM.Sheet.NewArt");
}

export async function onEditTalent(
  this: SheetHost,
  _event: PointerEvent,
  target: HTMLElement,
): Promise<void> {
  const itemId = target.dataset.itemId;
  if (itemId === undefined || itemId === "") return;
  const talent = this.actor.items.get(itemId);
  if (!talent || (talent.type as string) !== "talent") return;
  await openSheet(talent);
}

export async function onDeleteTalent(
  this: SheetHost,
  _event: PointerEvent,
  target: HTMLElement,
): Promise<void> {
  if (!this.isEditable) return;
  const itemId = target.dataset.itemId;
  if (itemId === undefined || itemId === "") return;
  const talent = this.actor.items.get(itemId);
  if (!talent || (talent.type as string) !== "talent") return;
  const confirmed = await foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize("KEDOM.Sheet.Action.deleteOwnedItem") },
    content: `<p>${game.i18n.format("KEDOM.Sheet.DeleteOwnedItemConfirm", {
      name: talent.name,
    })}</p>`,
  });
  if (confirmed !== true) return;
  await talent.delete();
}

export async function onOpenIdentityItem(
  this: SheetHost,
  _event: PointerEvent,
  target: HTMLElement,
): Promise<void> {
  const itemId = target.dataset.itemId;
  if (itemId === undefined || itemId === "") return;
  const item = this.actor.items.get(itemId);
  if (!item || (item.type as string) !== "origin") return;
  await openSheet(item);
}

export async function onEditWeapon(
  this: SheetHost,
  _event: PointerEvent,
  target: HTMLElement,
): Promise<void> {
  const itemId = target.dataset.itemId;
  if (itemId === undefined || itemId === "") return;
  const weapon = this.actor.items.get(itemId);
  if (!weapon || (weapon.type as string) !== "weapon") return;
  await openSheet(weapon);
}

export async function onDeleteWeapon(
  this: SheetHost,
  _event: PointerEvent,
  target: HTMLElement,
): Promise<void> {
  if (!this.isEditable) return;
  const itemId = target.dataset.itemId;
  if (itemId === undefined || itemId === "") return;
  const weapon = this.actor.items.get(itemId);
  if (!weapon || (weapon.type as string) !== "weapon") return;

  const confirmed = await foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize("KEDOM.Sheet.Action.deleteWeapon") },
    content: `<p>${game.i18n.format("KEDOM.Sheet.DeleteWeaponConfirm", {
      name: weapon.name,
    })}</p>`,
  });
  if (confirmed !== true) return;
  await weapon.delete();
}

export async function onEditArmor(
  this: SheetHost,
  _event: PointerEvent,
  target: HTMLElement,
): Promise<void> {
  const itemId = target.dataset.itemId;
  if (itemId === undefined || itemId === "") return;
  const armorItem = this.actor.items.get(itemId);
  if (!armorItem || (armorItem.type as string) !== "armor") return;
  await openSheet(armorItem);
}

export async function onDeleteArmor(
  this: SheetHost,
  _event: PointerEvent,
  target: HTMLElement,
): Promise<void> {
  if (!this.isEditable) return;
  const itemId = target.dataset.itemId;
  if (itemId === undefined || itemId === "") return;
  const armorItem = this.actor.items.get(itemId);
  if (!armorItem || (armorItem.type as string) !== "armor") return;

  const confirmed = await foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize("KEDOM.Sheet.Action.deleteArmor") },
    content: `<p>${game.i18n.format("KEDOM.Sheet.DeleteArmorConfirm", {
      name: armorItem.name,
    })}</p>`,
  });
  if (confirmed !== true) return;
  await armorItem.delete();
}

/** Concurrent clicks on one art would overspend effort; serialise per actor+art. */
const busyArts = new Set<string>();

async function withArtLock(
  sheet: SheetHost,
  target: HTMLElement,
  run: (art: Item.Implementation) => Promise<void>,
): Promise<void> {
  const itemId = target.dataset.itemId;
  if (itemId === undefined || itemId === "") return;
  const key = `${String(sheet.actor.uuid)}:${itemId}`;
  if (busyArts.has(key)) return;
  busyArts.add(key);
  try {
    if (!sheet.isEditable) return;
    const art = sheet.actor.items.get(itemId);
    if (!art || (art.type as string) !== "art") return;
    await run(art);
  } finally {
    busyArts.delete(key);
  }
}

/** Typed escape hatch: `system.activeUses` is not in the fvtt-types Item update union. */
function setArtUses(art: Item.Implementation, uses: number): Promise<unknown> {
  return art.update({ system: { activeUses: uses } });
}

function activeUsesOf(art: Item.Implementation): number {
  return Math.max(0, Math.floor(systemOf<ArtDataFields>(art).activeUses || 0));
}

async function spendArtEffort(sheet: SheetHost, art: Item.Implementation): Promise<void> {
  if (summarizeActorEffort(sheet.actor).value < 1) {
    ui.notifications.warn(game.i18n.localize("KEDOM.Art.NoEffort"));
    return;
  }
  await setArtUses(art, activeUsesOf(art) + 1);
  await postArtUseChat(art);
}

export async function onUseArt(
  this: SheetHost,
  _event: PointerEvent,
  target: HTMLElement,
): Promise<void> {
  await withArtLock(this, target, async (art) => {
    const { commitment } = systemOf<ArtDataFields>(art);
    // Concentration arts use Concentrate only.
    if (commitment === "concentration") return;
    if (commitment === "free") {
      await postArtUseChat(art);
      return;
    }
    await spendArtEffort(this, art);
  });
}

export async function onToggleArtConcentration(
  this: SheetHost,
  _event: PointerEvent,
  target: HTMLElement,
): Promise<void> {
  await withArtLock(this, target, async (art) => {
    if (systemOf<ArtDataFields>(art).commitment !== "concentration") return;
    await spendArtEffort(this, art);
  });
}

export async function onReleaseArtEffort(
  this: SheetHost,
  _event: PointerEvent,
  target: HTMLElement,
): Promise<void> {
  await withArtLock(this, target, async (art) => {
    if (systemOf<ArtDataFields>(art).commitment === "free") return;
    const uses = activeUsesOf(art);
    if (uses < 1) return;
    await setArtUses(art, uses - 1);
  });
}

export async function onEditArt(
  this: SheetHost,
  _event: PointerEvent,
  target: HTMLElement,
): Promise<void> {
  const itemId = target.dataset.itemId;
  if (itemId === undefined || itemId === "") return;
  const art = this.actor.items.get(itemId);
  if (!art || (art.type as string) !== "art") return;
  await openSheet(art);
}

export async function onDeleteArt(
  this: SheetHost,
  _event: PointerEvent,
  target: HTMLElement,
): Promise<void> {
  if (!this.isEditable) return;
  const itemId = target.dataset.itemId;
  if (itemId === undefined || itemId === "") return;
  const art = this.actor.items.get(itemId);
  if (!art || (art.type as string) !== "art") return;
  const confirmed = await foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize("KEDOM.Sheet.Action.deleteOwnedItem") },
    content: `<p>${game.i18n.format("KEDOM.Sheet.DeleteOwnedItemConfirm", {
      name: art.name,
    })}</p>`,
  });
  if (confirmed !== true) return;
  await art.delete();
}

/** Release every active use of arts whose commitment ends with `period`, and say so in chat. */
async function endArtPeriod(sheet: SheetHost, period: "scene" | "day"): Promise<void> {
  if (!sheet.isEditable || !sheet.actor.isOwner) return;
  const ends = period === "scene" ? ["scene"] : ["scene", "day"];
  const released: { _id: string | null; "system.activeUses": number }[] = [];
  let uses = 0;
  for (const item of sheet.actor.items) {
    if ((item.type as string) !== "art") continue;
    const s = systemOf<ArtDataFields>(item);
    const active = Math.max(0, Math.floor(s.activeUses || 0));
    if (active < 1 || !ends.includes(s.commitment)) continue;
    uses += active;
    released.push({ _id: item.id, "system.activeUses": 0 });
  }
  if (released.length) await sheet.actor.updateEmbeddedDocuments("Item", released);
  const data = {
    name: sheet.actor.name,
    period: game.i18n.localize(`KEDOM.Art.Commitment.${period}`).toLowerCase(),
    count: String(uses),
  };
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: sheet.actor as Actor.Stored }),
    content: `<p>${game.i18n.format(uses > 0 ? "KEDOM.Art.ReleasedMessage" : "KEDOM.Art.NothingToRelease", data)}</p>`,
  });
}

export async function onEndArtScene(this: SheetHost): Promise<void> {
  await endArtPeriod(this, "scene");
}

export async function onEndArtDay(this: SheetHost): Promise<void> {
  await endArtPeriod(this, "day");
}
