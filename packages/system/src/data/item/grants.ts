import {
  ABILITY_KEYS,
  PROFICIENCY_TIERS,
  SKILL_KEYS,
  type AbilityKey,
  type ProficiencyTier,
  type SkillKey,
} from "../../config/kedom.ts";

const { ArrayField, NumberField, SchemaField, StringField } = foundry.data.fields;

export type SkillGrant = {
  skillKey: SkillKey;
  proficiency: ProficiencyTier;
};

export type SpecializationGrant = {
  skillKey: SkillKey;
  slug: string;
  label: string;
};

export type AbilityGrant = {
  key: AbilityKey;
  delta: number;
};

export type GrantsFields = {
  skills: SkillGrant[];
  specializations: SpecializationGrant[];
  abilities: AbilityGrant[];
};

export function emptyGrants(): GrantsFields {
  return { skills: [], specializations: [], abilities: [] };
}

export function grantsSchema() {
  return new SchemaField({
    skills: new ArrayField(
      new SchemaField({
        skillKey: new StringField({
          required: true,
          nullable: false,
          blank: false,
          choices: [...SKILL_KEYS],
          initial: "exert",
        }),
        proficiency: new StringField({
          required: true,
          nullable: false,
          blank: false,
          choices: [...PROFICIENCY_TIERS],
          initial: "apprentice",
        }),
      }),
      { initial: [] },
    ),
    specializations: new ArrayField(
      new SchemaField({
        skillKey: new StringField({
          required: true,
          nullable: false,
          blank: false,
          choices: [...SKILL_KEYS],
          initial: "craft",
        }),
        slug: new StringField({ required: true, nullable: false, blank: false, initial: "" }),
        label: new StringField({ required: true, nullable: false, blank: false, initial: "" }),
      }),
      { initial: [] },
    ),
    abilities: new ArrayField(
      new SchemaField({
        key: new StringField({
          required: true,
          nullable: false,
          blank: false,
          choices: [...ABILITY_KEYS],
          initial: "mgh",
        }),
        delta: new NumberField({
          required: true,
          nullable: false,
          integer: true,
          initial: 0,
        }),
      }),
      { initial: [] },
    ),
  });
}
