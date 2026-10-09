import { ART_COMMITMENTS, type ArtCommitment } from "../../config/art.ts";

const { BooleanField, HTMLField, StringField } = foundry.data.fields;

function artSchema() {
  return {
    slug: new StringField({
      required: true,
      nullable: false,
      blank: true,
      initial: "",
    }),
    description: new HTMLField({ required: true, nullable: false, blank: true, initial: "" }),
    classSlug: new StringField({
      required: true,
      nullable: false,
      blank: true,
      initial: "",
    }),
    commitment: new StringField({
      required: true,
      nullable: false,
      blank: false,
      choices: () =>
        Object.fromEntries(
          ART_COMMITMENTS.map((c) => [c, game.i18n.localize(`KEDOM.Art.Commitment.${c}`)]),
        ),
      initial: "scene",
    }),
    /** Scene/day commitment flag (Effort spent until end scene/day). */
    effortCommitted: new BooleanField({ required: true, nullable: false, initial: false }),
    /** Concentration toggle (indefinite until released). */
    concentrating: new BooleanField({ required: true, nullable: false, initial: false }),
  };
}

export type ArtSchema = ReturnType<typeof artSchema>;

export type ArtDataFields = {
  slug: string;
  description: string;
  classSlug: string;
  commitment: ArtCommitment;
  effortCommitted: boolean;
  concentrating: boolean;
};

export class ArtData extends foundry.abstract.TypeDataModel<ArtSchema, Item.Implementation> {
  static override defineSchema(): ArtSchema {
    return artSchema();
  }
}
