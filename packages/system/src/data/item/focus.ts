import { grantsSchema, type GrantsFields } from "./grants.ts";

const { HTMLField } = foundry.data.fields;

function focusSchema() {
  return {
    description: new HTMLField({ required: true, nullable: false, blank: true, initial: "" }),
    grants: grantsSchema(),
  };
}

export type FocusSchema = ReturnType<typeof focusSchema>;

export type FocusDataFields = {
  description: string;
  grants: GrantsFields;
};

export class FocusData extends foundry.abstract.TypeDataModel<FocusSchema, Item.Implementation> {
  static override defineSchema(): FocusSchema {
    return focusSchema();
  }
}
