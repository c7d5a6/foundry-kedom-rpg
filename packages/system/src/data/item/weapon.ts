import type { SkillKey } from "../../config/kedom.ts";

/** Combat skills a weapon may use for attack proficiency. */
export const WEAPON_SKILL_KEYS = ["punch", "shoot", "stab"] as const;
export type WeaponSkillKey = (typeof WEAPON_SKILL_KEYS)[number];

const { NumberField, StringField } = foundry.data.fields;

function weaponSchema() {
  return {
    skill: new StringField({
      required: true,
      nullable: false,
      blank: false,
      choices: [...WEAPON_SKILL_KEYS],
      initial: "stab",
    }),
    damageFormula: new StringField({
      required: true,
      nullable: false,
      blank: false,
      initial: "1d6",
    }),
    attackBonus: new NumberField({
      required: true,
      nullable: false,
      integer: true,
      initial: 0,
    }),
  };
}

export type WeaponSchema = ReturnType<typeof weaponSchema>;

export type WeaponDataFields = {
  skill: WeaponSkillKey;
  damageFormula: string;
  attackBonus: number;
};

export function normalizeWeaponSkill(raw: string | undefined): WeaponSkillKey {
  if (WEAPON_SKILL_KEYS.includes(raw as WeaponSkillKey)) return raw as WeaponSkillKey;
  // Legacy ability field from early POC C
  if (raw === "dex") return "shoot";
  if (raw === "mgh") return "stab";
  return "stab";
}

/** Narrow SkillKey for weapon combat skills. */
export function weaponSkillAsSkillKey(skill: WeaponSkillKey): SkillKey {
  return skill as SkillKey;
}

export class WeaponData extends foundry.abstract.TypeDataModel<
  WeaponSchema,
  Item.Implementation
> {
  static override defineSchema(): WeaponSchema {
    return weaponSchema();
  }
}
