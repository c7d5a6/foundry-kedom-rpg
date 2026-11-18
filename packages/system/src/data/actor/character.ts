import {
  ABILITY_KEYS,
  LUCK_SCORE_MAX,
  LUCK_SCORE_MIN,
  PROFICIENCY_TIERS,
  SAVE_ABILITY,
  SAVE_KEYS,
  SKILL_KEYS,
  proficiencyBonusFor,
  type AbilityKey,
  type SaveKey,
  type SkillKey,
} from "../../config/kedom.ts";
import { SKILL_SPECIALIZATION_KIND } from "../../config/specializations.ts";
import { abilityModifier } from "../../derivations/ability-mod.ts";
import { appliedProficiencyBonus } from "../../derivations/skill-proficiency.ts";
import { resolveFromFocus, strainLimitFromFocus } from "../../derivations/strain.ts";

const { ArrayField, BooleanField, HTMLField, NumberField, SchemaField, StringField } =
  foundry.data.fields;

function abilitySchema(opts: { min: number; max: number }) {
  return new SchemaField({
    value: new NumberField({
      required: true,
      nullable: false,
      integer: true,
      min: opts.min,
      max: opts.max,
      initial: 10,
    }),
    baseMod: new NumberField({
      required: true,
      nullable: false,
      integer: true,
      initial: 0,
    }),
  });
}

function specializationSchema() {
  return new SchemaField({
    slug: new StringField({ required: true, nullable: false, blank: false }),
    label: new StringField({ required: true, nullable: false, blank: false }),
    /** False = listed but not counting toward proficiency slots (free specs). */
    selected: new BooleanField({ required: true, nullable: false, initial: true }),
  });
}

function skillSchema() {
  return new SchemaField({
    proficiency: new StringField({
      required: true,
      nullable: false,
      blank: false,
      choices: [...PROFICIENCY_TIERS],
      initial: "untrained",
    }),
    specializations: new ArrayField(specializationSchema(), { initial: [] }),
    /** Dice kept on a skill check (default 2 → 2d10 / Nd10kh2). */
    baseDice: new NumberField({
      required: true,
      nullable: false,
      integer: true,
      min: 1,
      initial: 2,
    }),
    /** Signed advantage net applied when rolling this skill (dialog seeds from it). */
    defaultAdvantage: new NumberField({
      required: true,
      nullable: false,
      integer: true,
      initial: 0,
    }),
    /**
     * Applied proficiency bonus (half when the skill has specialisations and none is selected).
     * Set in prepareBaseData so Active Effect formulas can reference it.
     */
    proficiencyBonus: new NumberField({
      required: true,
      nullable: false,
      integer: true,
      initial: 0,
      persisted: false,
    }),
    /** Flat bonus added to attack rolls that use this skill. Active Effects ADD here. */
    attackMod: new NumberField({
      required: true,
      nullable: false,
      integer: true,
      initial: 0,
      persisted: false,
    }),
    /** Flat bonus added to damage rolls that use this skill. Active Effects ADD here. */
    damageMod: new NumberField({
      required: true,
      nullable: false,
      integer: true,
      initial: 0,
      persisted: false,
    }),
  });
}

function saveSchema() {
  return new SchemaField({
    proficiency: new StringField({
      required: true,
      nullable: false,
      blank: false,
      choices: [...PROFICIENCY_TIERS],
      initial: "untrained",
    }),
  });
}

function attributesSchema() {
  return new SchemaField({
    hp: new SchemaField({
      value: new NumberField({
        required: true,
        nullable: false,
        integer: true,
        min: 0,
        initial: 0,
      }),
      max: new NumberField({
        required: true,
        nullable: false,
        integer: true,
        min: 0,
        initial: 0,
      }),
    }),
    strain: new SchemaField({
      value: new NumberField({
        required: true,
        nullable: false,
        integer: true,
        min: 0,
        initial: 0,
      }),
    }),
    wounds: new SchemaField({
      value: new NumberField({
        required: true,
        nullable: false,
        integer: true,
        min: 0,
        initial: 0,
      }),
      notes: new HTMLField({ required: true, nullable: false, blank: true, initial: "" }),
    }),
  });
}

function detailsSchema() {
  return new SchemaField({
    level: new NumberField({
      required: true,
      nullable: false,
      integer: true,
      min: 1,
      initial: 1,
    }),
    region: new StringField({
      required: true,
      nullable: false,
      blank: true,
      initial: "",
    }),
    culture: new StringField({
      required: true,
      nullable: false,
      blank: true,
      initial: "",
    }),
    background: new StringField({
      required: true,
      nullable: false,
      blank: true,
      initial: "",
    }),
    class: new StringField({
      required: true,
      nullable: false,
      blank: true,
      initial: "",
    }),
    notes: new HTMLField({ required: true, nullable: false, blank: true, initial: "" }),
  });
}

function characterSchema() {
  const abilities = {} as Record<AbilityKey, ReturnType<typeof abilitySchema>>;
  for (const key of ABILITY_KEYS) {
    abilities[key] =
      key === "lck"
        ? abilitySchema({ min: LUCK_SCORE_MIN, max: LUCK_SCORE_MAX })
        : abilitySchema({ min: 3, max: 18 });
  }

  const skills = {} as Record<SkillKey, ReturnType<typeof skillSchema>>;
  for (const key of SKILL_KEYS) {
    skills[key] = skillSchema();
  }

  const saves = {} as Record<SaveKey | "luck", ReturnType<typeof saveSchema>>;
  for (const key of SAVE_KEYS) {
    saves[key] = saveSchema();
  }
  saves.luck = saveSchema();

  return {
    abilities: new SchemaField(abilities),
    skills: new SchemaField(skills),
    attributes: attributesSchema(),
    combat: new SchemaField({
      ac: new NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
      meleeDamageBonus: new NumberField({
        required: true,
        nullable: false,
        integer: true,
        initial: 0,
      }),
    }),
    details: detailsSchema(),
    saves: new SchemaField(saves),
  };
}

export type CharacterSchema = ReturnType<typeof characterSchema>;

/** Skill as read during preparation; older actors can lack the dice fields. */
type PreparedSkill = Omit<SkillFields, "baseDice" | "defaultAdvantage"> &
  Partial<Pick<SkillFields, "baseDice" | "defaultAdvantage">>;

/** Combat group as read during preparation; older actors can lack the damage bonus. */
interface CombatFields {
  ac: number;
  meleeDamageBonus?: number;
}

interface AbilityFields {
  value: number;
  baseMod: number;
  mod?: number;
}

export interface SkillSpecialization {
  slug: string;
  label: string;
  selected: boolean;
}

export interface SkillFields {
  proficiency: string;
  specializations: SkillSpecialization[];
  baseDice: number;
  defaultAdvantage: number;
  proficiencyBonus?: number;
  attackMod?: number;
  damageMod?: number;
}

export interface SaveFields {
  proficiency: string;
  mod?: number;
}

interface AttributesDerived {
  hp: { value: number; max: number };
  strain: { value: number };
  // Optional: actors saved before wounds existed may lack the group.
  wounds?: { value: number; notes: string };
  strainLimit?: number;
  resolve?: number;
  wounded?: boolean;
}

export class CharacterData extends foundry.abstract.TypeDataModel<
  CharacterSchema,
  Actor.Implementation
> {
  static override defineSchema(): CharacterSchema {
    return characterSchema();
  }

  override prepareBaseData(): void {
    const attrs = this.attributes as AttributesDerived;
    attrs.strainLimit = 0;
    attrs.resolve = 0;
    attrs.wounded = false;
    // AE-first: zero-init paths Active Effects may ADD onto before prepareDerivedData.
    const combat = this.combat as CombatFields;
    combat.ac = 0;
    combat.meleeDamageBonus = Math.floor(combat.meleeDamageBonus ?? 0);
    const skills = this.skills as Record<SkillKey, PreparedSkill>;
    for (const key of SKILL_KEYS) {
      const skill = skills[key];
      if (!skill) continue;
      // Ensure AE change paths exist; keep persisted base (ADD stacks on top).
      skill.baseDice = Math.max(1, Math.floor(skill.baseDice ?? 2));
      skill.defaultAdvantage = Math.floor(skill.defaultAdvantage ?? 0);
      const tierBonus = proficiencyBonusFor(skill.proficiency);
      const kind = SKILL_SPECIALIZATION_KIND[key];
      skill.proficiencyBonus = appliedProficiencyBonus({
        tierBonus,
        specialized: kind === "none",
      });
      skill.attackMod = Math.floor(skill.attackMod ?? 0);
      skill.damageMod = Math.floor(skill.damageMod ?? 0);
    }
    for (const key of SAVE_KEYS) {
      const s = this.saves[key] as SaveFields;
      s.mod = 0;
    }
    (this.saves.luck as SaveFields).mod = 0;
  }

  override prepareDerivedData(): void {
    for (const key of ABILITY_KEYS) {
      const a = this.abilities[key] as AbilityFields;
      a.mod = abilityModifier(a.value, a.baseMod);
    }

    const foc = this.abilities.foc as AbilityFields;
    const attrs = this.attributes as AttributesDerived;
    // `+=`: prepareBaseData zeroed these so Active Effects ADD before derivation.
    attrs.strainLimit = (attrs.strainLimit ?? 0) + strainLimitFromFocus(foc.mod ?? 0);
    attrs.resolve = (attrs.resolve ?? 0) + resolveFromFocus(foc.mod ?? 0);
    attrs.wounded = (attrs.wounds?.value ?? 0) >= 1;
    if (attrs.hp.max > 0 && attrs.hp.value > attrs.hp.max) attrs.hp.value = attrs.hp.max;

    for (const key of SAVE_KEYS) {
      const s = this.saves[key] as SaveFields;
      const abilityKey = SAVE_ABILITY[key];
      const ability = this.abilities[abilityKey] as AbilityFields;
      const tierBonus = proficiencyBonusFor(s.proficiency);
      s.mod = (s.mod ?? 0) + (ability.mod ?? 0) + tierBonus;
    }

    const luckSave = this.saves.luck as SaveFields;
    const lck = this.abilities.lck as AbilityFields;
    luckSave.mod = (luckSave.mod ?? 0) + (lck.mod ?? 0) + proficiencyBonusFor(luckSave.proficiency);

    // Defense = 10 + Reflex save modifier (armor does not affect Defense for now).
    const reflex = this.saves.reflex as SaveFields;
    const combat = this.combat as Partial<CombatFields>;
    combat.ac = (combat.ac ?? 0) + 10 + (reflex.mod ?? 0);
  }
}

declare module "fvtt-types/configuration" {
  interface DataModelConfig {
    Actor: {
      character: typeof CharacterData;
    };
  }

  /** Treat Foundry globals as initialized (see fvtt-types AssumeHookRan). */
  interface AssumeHookRan {
    ready: never;
  }
}
