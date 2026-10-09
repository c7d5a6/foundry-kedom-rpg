import { grantsSchema, type GrantsFields } from "./grants.ts";
import { TALENT_CATEGORIES, type TalentCategory } from "../../config/talent.ts";

export { TALENT_CATEGORIES, type TalentCategory };

const { HTMLField, StringField } = foundry.data.fields;

function talentSchema() {
  return {
    /** Identity slug — links from culture `talentSlug` / class `talentSlugs[]`. */
    slug: new StringField({
      required: true,
      nullable: false,
      blank: true,
      initial: "",
    }),
    description: new HTMLField({ required: true, nullable: false, blank: true, initial: "" }),
    category: new StringField({
      required: true,
      nullable: false,
      blank: false,
      // A record, not an array: formInput uses Object.entries, so an array's option values are 0, 1, 2…
      choices: () =>
        Object.fromEntries(
          TALENT_CATEGORIES.map((category) => [
            category,
            game.i18n.localize(`KEDOM.Talent.Category.${category}`),
          ]),
        ),
      initial: "general",
    }),
    grants: grantsSchema(),
  };
}

export type TalentSchema = ReturnType<typeof talentSchema>;

export type TalentDataFields = {
  slug: string;
  description: string;
  category: TalentCategory;
  grants: GrantsFields;
};

export class TalentData extends foundry.abstract.TypeDataModel<TalentSchema, Item.Implementation> {
  static override defineSchema(): TalentSchema {
    return talentSchema();
  }
}
