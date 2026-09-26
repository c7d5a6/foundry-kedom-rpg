import { grantsSchema, type GrantsFields } from "./grants.ts";
import { TALENT_CATEGORIES, type TalentCategory } from "../../config/talent.ts";

export { TALENT_CATEGORIES, type TalentCategory };

const { HTMLField, StringField } = foundry.data.fields;

function talentSchema() {
  return {
    description: new HTMLField({ required: true, nullable: false, blank: true, initial: "" }),
    category: new StringField({
      required: true,
      nullable: false,
      blank: false,
      choices: [...TALENT_CATEGORIES],
      initial: "any",
    }),
    featureKey: new StringField({
      required: true,
      nullable: false,
      blank: true,
      initial: "",
    }),
    grants: grantsSchema(),
  };
}

export type TalentSchema = ReturnType<typeof talentSchema>;

export type TalentDataFields = {
  description: string;
  category: TalentCategory;
  featureKey: string;
  grants: GrantsFields;
};

export class TalentData extends foundry.abstract.TypeDataModel<TalentSchema, Item.Implementation> {
  static override defineSchema(): TalentSchema {
    return talentSchema();
  }
}
