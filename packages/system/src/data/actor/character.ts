import {
  ABILITY_KEYS,
  PROFICIENCY_TIERS,
  SKILL_KEYS,
  type AbilityKey,
  type SkillKey,
} from "../../config/kedom.ts";
import { abilityModifier } from "../../derivations/ability-mod.ts";

const { ArrayField, BooleanField, NumberField, SchemaField, StringField } = foundry.data.fields;

function abilitySchema() {
  return new SchemaField({
    value: new NumberField({
      required: true,
      nullable: false,
      integer: true,
      min: 3,
      max: 18,
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
  });
}

function characterSchema() {
  const abilities = {} as Record<AbilityKey, ReturnType<typeof abilitySchema>>;
  for (const key of ABILITY_KEYS) {
    abilities[key] = abilitySchema();
  }

  const skills = {} as Record<SkillKey, ReturnType<typeof skillSchema>>;
  for (const key of SKILL_KEYS) {
    skills[key] = skillSchema();
  }

  return {
    abilities: new SchemaField(abilities),
    skills: new SchemaField(skills),
  };
}

export type CharacterSchema = ReturnType<typeof characterSchema>;

type AbilityFields = { value: number; baseMod: number; mod?: number };

export type SkillSpecialization = { slug: string; label: string; selected: boolean };

export type SkillFields = {
  proficiency: string;
  specializations: SkillSpecialization[];
};

export class CharacterData extends foundry.abstract.TypeDataModel<
  CharacterSchema,
  Actor.Implementation
> {
  static override defineSchema(): CharacterSchema {
    return characterSchema();
  }

  override prepareDerivedData(): void {
    for (const key of ABILITY_KEYS) {
      const a = this.abilities[key] as AbilityFields;
      a.mod = abilityModifier(a.value, a.baseMod);
    }
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
