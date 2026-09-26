import { grantsSchema, type GrantsFields } from "./grants.ts";

const { HTMLField } = foundry.data.fields;

function talentSchema() {
  return {
    description: new HTMLField({ required: true, nullable: false, blank: true, initial: "" }),
    grants: grantsSchema(),
  };
}

export type TalentSchema = ReturnType<typeof talentSchema>;

export type TalentDataFields = {
  description: string;
  grants: GrantsFields;
};

export class TalentData extends foundry.abstract.TypeDataModel<TalentSchema, Item.Implementation> {
  static override defineSchema(): TalentSchema {
    return talentSchema();
  }
}
