import { ART_COMMITMENTS, type ArtCommitment } from "../../config/art.ts";

const { HTMLField, NumberField, StringField } = foundry.data.fields;

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
    /**
     * Number of active Effort commits for this art (scene/day/concentration).
     * Each Use / Concentrate increments by 1; each release decrements by 1.
     * Free arts never increment this.
     */
    activeUses: new NumberField({
      required: true,
      nullable: false,
      integer: true,
      min: 0,
      initial: 0,
    }),
  };
}

export type ArtSchema = ReturnType<typeof artSchema>;

export type ArtDataFields = {
  slug: string;
  description: string;
  classSlug: string;
  commitment: ArtCommitment;
  activeUses: number;
};

export class ArtData extends foundry.abstract.TypeDataModel<ArtSchema, Item.Implementation> {
  static override defineSchema(): ArtSchema {
    return artSchema();
  }

  /** Migrate legacy single-flag commits → activeUses count. */
  static override migrateData(source: Record<string, unknown>): Record<string, unknown> {
    const data = super.migrateData(source) as Record<string, unknown>;
    if (typeof data.activeUses !== "number" || !Number.isFinite(data.activeUses)) {
      const legacy =
        data.effortCommitted === true || data.concentrating === true ? 1 : 0;
      data.activeUses = legacy;
    } else {
      data.activeUses = Math.max(0, Math.floor(data.activeUses as number));
    }
    delete data.effortCommitted;
    delete data.concentrating;
    return data;
  }
}
