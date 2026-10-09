import { grantsSchema } from "./grants.ts";
import { CLASS_SAVE_TRACKS } from "./origin-fields.ts";
import {
  ORIGIN_SUBTYPES,
  normalizeOriginSubtype,
  type OriginSubtype,
} from "../../config/origin.ts";
import { ABILITY_KEYS } from "../../config/kedom.ts";

export { CLASS_SAVE_TRACKS, type OriginDataFields } from "./origin-fields.ts";
export type { ClassArtsFields, ClassSaveTrack, PrioritizedSaveFields } from "./origin-fields.ts";
export { ORIGIN_SUBTYPES, normalizeOriginSubtype, type OriginSubtype };

const { ArrayField, BooleanField, HTMLField, NumberField, SchemaField, StringField } =
  foundry.data.fields;

function prioritizedSaveSchema() {
  return new SchemaField({
    save: new StringField({
      required: true,
      nullable: false,
      blank: false,
      choices: [...CLASS_SAVE_TRACKS],
      initial: "reflex",
    }),
    priority: new NumberField({
      required: true,
      nullable: false,
      integer: true,
      initial: 0,
    }),
  });
}

function classArtsSchema() {
  return new SchemaField({
    /** Empty string = no arts skill (martial classes). */
    skillKey: new StringField({
      required: true,
      nullable: false,
      blank: true,
      initial: "",
    }),
    abilityKeys: new ArrayField(
      new StringField({
        required: true,
        nullable: false,
        blank: false,
        choices: [...ABILITY_KEYS],
        initial: "kno",
      }),
      { initial: [] },
    ),
    slotsByLevel: new ArrayField(new NumberField({ required: true, nullable: false, integer: true, min: 0, initial: 0 }), {
      initial: () => [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    }),
    receiveTableKey: new StringField({
      required: true,
      nullable: false,
      blank: true,
      initial: "",
    }),
    artKeys: new ArrayField(
      new StringField({ required: true, nullable: false, blank: false, initial: "" }),
      { initial: [] },
    ),
  });
}

function originSchema() {
  return {
    subType: new StringField({
      required: true,
      nullable: false,
      blank: false,
      choices: [...ORIGIN_SUBTYPES],
      initial: "background",
    }),
    /** Identity slug (e.g. `warrior`, `warrior-partial`). Empty for unauthored races/backgrounds. */
    slug: new StringField({
      required: true,
      nullable: false,
      blank: true,
      initial: "",
    }),
    description: new HTMLField({ required: true, nullable: false, blank: true, initial: "" }),
    /**
     * Region: character sheet banner image path. Blank keeps the system default art.
     * Other subtypes ignore this field.
     */
    bannerImg: new StringField({
      required: true,
      nullable: false,
      blank: true,
      initial: "",
    }),
    grants: grantsSchema(),
    /** Class only: true = full class; false = Adventurer partial. */
    isFull: new BooleanField({ required: true, nullable: false, initial: true }),
    hitDie: new StringField({
      required: true,
      nullable: false,
      blank: false,
      initial: "1d6",
    }),
    hitDiePriority: new NumberField({
      required: true,
      nullable: false,
      integer: true,
      initial: 0,
    }),
    talentPicks: new SchemaField({
      warrior: new NumberField({
        required: true,
        nullable: false,
        integer: true,
        min: 0,
        initial: 0,
      }),
      expert: new NumberField({
        required: true,
        nullable: false,
        integer: true,
        min: 0,
        initial: 0,
      }),
      any: new NumberField({
        required: true,
        nullable: false,
        integer: true,
        min: 0,
        initial: 0,
      }),
    }),
    arts: classArtsSchema(),
    saves: new SchemaField({
      primary: prioritizedSaveSchema(),
      secondary: prioritizedSaveSchema(),
    }),
    /** Region: weighted cultures with per-pair background slugs. */
    cultures: new ArrayField(
      new SchemaField({
        slug: new StringField({ required: true, nullable: false, blank: false, initial: "" }),
        weight: new NumberField({
          required: true,
          nullable: false,
          integer: true,
          positive: true,
          initial: 1,
        }),
        backgroundSlugs: new ArrayField(
          new StringField({ required: true, nullable: false, blank: false, initial: "" }),
          { initial: [] },
        ),
      }),
      { initial: [] },
    ),
    /** Race (culture): single talent + allowed class slugs. */
    talentSlug: new StringField({
      required: true,
      nullable: false,
      blank: true,
      initial: "",
    }),
    /** Class: ordered granted talent slugs (preferred over legacy talentSlug). */
    talentSlugs: new ArrayField(
      new StringField({ required: true, nullable: false, blank: false, initial: "" }),
      { initial: [] },
    ),
    classSlugs: new ArrayField(
      new StringField({ required: true, nullable: false, blank: false, initial: "" }),
      { initial: [] },
    ),
    /** Background: free grant + exactly eight growth rows (indexes 0–7 = rolls 1–8). */
    free: new SchemaField({
      skillKey: new StringField({ required: true, nullable: false, blank: true, initial: "" }),
      specSlug: new StringField({ required: true, nullable: false, blank: true, initial: "" }),
    }),
    growth: new ArrayField(
      new SchemaField({
        skillKey: new StringField({ required: true, nullable: false, blank: true, initial: "" }),
        specSlug: new StringField({ required: true, nullable: false, blank: true, initial: "" }),
      }),
      { initial: () => Array.from({ length: 8 }, () => ({ skillKey: "", specSlug: "" })) },
    ),
  };
}

export type OriginSchema = ReturnType<typeof originSchema>;

export class OriginData extends foundry.abstract.TypeDataModel<OriginSchema, Item.Implementation> {
  static override defineSchema(): OriginSchema {
    return originSchema();
  }
}
