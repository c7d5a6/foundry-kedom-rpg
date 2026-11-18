import { rollAttack } from "../../../actions/attack-roll.ts";
import { rollDamage } from "../../../actions/damage-roll.ts";
import { rollLuckSave } from "../../../actions/luck-save.ts";
import { rollSaveCheck } from "../../../actions/save-check.ts";
import { rollSkillCheck } from "../../../actions/skill-check.ts";
import { rollStrainSave } from "../../../actions/strain-save.ts";
import { takeWound } from "../../../actions/wound-roll.ts";
import type { SaveKey } from "../../../config/kedom.ts";
import { isSkillKey, requireOwnership, type SheetHost } from "./helpers.ts";

export async function onTakeWound(this: SheetHost): Promise<void> {
  if (this.isEditMode) return;
  if (!requireOwnership(this)) return;
  await takeWound(this.actor);
}

export async function onRollAttack(
  this: SheetHost,
  _event: PointerEvent,
  target: HTMLElement,
): Promise<void> {
  if (this.isEditMode) return;
  if (!requireOwnership(this)) return;
  const itemId = target.dataset.itemId;
  if (itemId === undefined || itemId === "") return;
  const weapon = this.actor.items.get(itemId);
  if (!weapon || (weapon.type as string) !== "weapon") return;
  await rollAttack(this.actor, weapon);
}

export async function onRollDamage(
  this: SheetHost,
  _event: PointerEvent,
  target: HTMLElement,
): Promise<void> {
  if (this.isEditMode) return;
  if (!requireOwnership(this)) return;
  const itemId = target.dataset.itemId;
  if (itemId === undefined || itemId === "") return;
  const weapon = this.actor.items.get(itemId);
  if (!weapon || (weapon.type as string) !== "weapon") return;
  await rollDamage(this.actor, weapon);
}

export async function onRollSkill(
  this: SheetHost,
  event: PointerEvent,
  target: HTMLElement,
): Promise<void> {
  if (this.isEditMode) return;
  if (!requireOwnership(this)) return;
  const skillKey = target.dataset.skillKey;
  if (!isSkillKey(skillKey)) return;
  await rollSkillCheck(this.actor, skillKey, {
    configure: event.ctrlKey || event.metaKey,
  });
}

export async function onRollSave(
  this: SheetHost,
  event: PointerEvent,
  target: HTMLElement,
): Promise<void> {
  if (this.isEditMode) return;
  if (!requireOwnership(this)) return;
  const saveKey = target.dataset.saveKey;
  if (saveKey === undefined || saveKey === "") return;
  await rollSaveCheck(this.actor, saveKey as SaveKey, {
    configure: event.ctrlKey || event.metaKey,
  });
}

export async function onRollLuckSave(this: SheetHost, event: PointerEvent): Promise<void> {
  if (this.isEditMode) return;
  if (!requireOwnership(this)) return;
  await rollLuckSave(this.actor, {
    configure: event.ctrlKey || event.metaKey,
  });
}

export async function onRollStrainSave(this: SheetHost): Promise<void> {
  if (this.isEditMode) return;
  if (!requireOwnership(this)) return;
  await rollStrainSave(this.actor);
}
