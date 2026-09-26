import { grantsSchema, type GrantsFields } from "./grants.ts";
import {
  ORIGIN_SUBTYPES,
  normalizeOriginSubtype,
  type OriginSubtype,
} from "../../config/origin.ts";

export { ORIGIN_SUBTYPES, normalizeOriginSubtype, type OriginSubtype };

const { HTMLField, NumberField, StringField } = foundry.data.fields;

function originSchema() {
  return {
    subType: new StringField({
      required: true,
      nullable: false,
      blank: false,
      choices: [...ORIGIN_SUBTYPES],
      initial: "background",
    }),
    description: new HTMLField({ required: true, nullable: false, blank: true, initial: "" }),
    grants: grantsSchema(),
    hitDie: new StringField({
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

export type OriginSchema = ReturnType<typeof originSchema>;

export type OriginDataFields = {
  subType: OriginSubtype;
  description: string;
  grants: GrantsFields;
  hitDie: string;
  attackBonus: number;
};

export class OriginData extends foundry.abstract.TypeDataModel<
  OriginSchema,
  Item.Implementation
> {
  static override defineSchema(): OriginSchema {
    return originSchema();
  }
}
