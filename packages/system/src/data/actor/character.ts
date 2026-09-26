import {
  ABILITY_KEYS,
  LUCK_SCORE_MAX,
  LUCK_SCORE_MIN,
  PROFICIENCY_BONUS,
  PROFICIENCY_TIERS,
  SAVE_ABILITY,
  SAVE_KEYS,
  SKILL_KEYS,
  type AbilityKey,
  type ProficiencyTier,
  type SaveKey,
  type SkillKey,
} from "../../config/kedom.ts";
import { abilityModifier } from "../../derivations/ability-mod.ts";
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
    attributes: new SchemaField({
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
    }),
    combat: new SchemaField({
      ac: new NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
      attackBonus: new NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
      meleeDamageBonus: new NumberField({
        required: true,
        nullable: false,
        integer: true,
        initial: 0,
      }),
    }),
    details: new SchemaField({
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
    }),
    saves: new SchemaField(saves),
  };
}

export type CharacterSchema = ReturnType<typeof characterSchema>;

type AbilityFields = { value: number; baseMod: number; mod?: number };

export type SkillSpecialization = { slug: string; label: string; selected: boolean };

export type SkillFields = {
  proficiency: string;
  specializations: SkillSpecialization[];
  baseDice: number;
  defaultAdvantage: number;
};

export type SaveFields = {
  proficiency: string;
  mod?: number;
};

type AttributesDerived = {
  hp: { value: number; max: number };
  strain: { value: number };
  wounds: { value: number; notes: string };
  strainLimit?: number;
  resolve?: number;
  wounded?: boolean;
};

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
    const combat = this.combat as { ac: number };
    combat.ac = 0;
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
    const dex = this.abilities.dex as AbilityFields;
    const attrs = this.attributes as AttributesDerived;
    attrs.strainLimit = strainLimitFromFocus(foc.value);
    attrs.resolve = resolveFromFocus(foc.value);
    attrs.wounded = (attrs.wounds?.value ?? 0) >= 1;

    const combat = this.combat as { ac: number };
    combat.ac = 10 + (dex.mod ?? 0);

    for (const key of SAVE_KEYS) {
      const s = this.saves[key] as SaveFields;
      const abilityKey = SAVE_ABILITY[key];
      const ability = this.abilities[abilityKey] as AbilityFields;
      const tier = s.proficiency as ProficiencyTier;
      const tierBonus = PROFICIENCY_BONUS[tier] ?? 0;
      s.mod = (ability.mod ?? 0) + tierBonus;
    }

    const luckSave = this.saves.luck as SaveFields;
    const lck = this.abilities.lck as AbilityFields;
    const luckTier = luckSave.proficiency as ProficiencyTier;
    luckSave.mod = (lck.mod ?? 0) + (PROFICIENCY_BONUS[luckTier] ?? 0);
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
