import { localize } from "../../../i18n/localize.ts";
import {
  PROFICIENCY_SPECIALIZATION_SLOTS,
  SKILL_ABILITY,
  type ProficiencyTier,
  type SkillKey,
} from "../../../config/kedom.ts";
import type { SkillFields, SkillSpecialization } from "../../../data/actor/character.ts";

/** The slice of the character sheet that action handlers rely on. */
export interface SheetHost {
  actor: Actor.Implementation;
  isEditable: boolean;
  isEditMode: boolean;
}

export function isSkillKey(value: string | undefined): value is SkillKey {
  return value !== undefined && Object.hasOwn(SKILL_ABILITY, value);
}

export function localizeSpecLabel(skillKey: SkillKey, leaf: string): string {
  const path = `KEDOM.Specialization.${skillKey}.${leaf}`;
  const v = game.i18n.localize(path);
  return !v || v === path ? leaf : v;
}

export function isSpecializationSelected(spec: SkillSpecialization): boolean {
  return spec.selected;
}

export function countSelectedSpecializations(skill: SkillFields): number {
  return skill.specializations.filter(isSpecializationSelected).length;
}

export function specializationSlots(proficiency: string): number {
  return PROFICIENCY_SPECIALIZATION_SLOTS[proficiency as ProficiencyTier] ?? 0;
}

/**
 * Rolls need ownership. The sheet disables the buttons for viewers, but a handler can still
 * fire (keyboard, stale DOM), so warn instead of letting Foundry throw a raw permission error.
 */
export function requireOwnership(sheet: SheetHost): boolean {
  if (sheet.isEditable) return true;
  ui.notifications.warn(localize("KEDOM.Sheet.NeedOwnership"));
  return false;
}
