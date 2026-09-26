import type { GrantsFields } from "../data/item/grants.ts";
import type { OriginSubtype } from "../config/origin.ts";

export type SampleItemData = {
  name: string;
  type: "origin" | "talent";
  /** Stable id used to detect already-added samples on an actor. */
  sampleId: string;
  img?: string;
  system: Record<string, unknown>;
};

function grants(partial: Partial<GrantsFields>): GrantsFields {
  return {
    skills: partial.skills ?? [],
    specializations: partial.specializations ?? [],
    abilities: partial.abilities ?? [],
  };
}

function origin(
  sampleId: string,
  name: string,
  subType: OriginSubtype,
  system: Record<string, unknown>,
): SampleItemData {
  return {
    sampleId,
    name,
    type: "origin",
    img: "icons/svg/mystery-man.svg",
    system: { subType, description: "", hitDie: "1d6", attackBonus: 0, ...system },
  };
}

/** Hand-authored demo items for POC character create (no compendium). */
export const CREATION_SAMPLES: SampleItemData[] = [
  origin("sample-race-human-nerland", "Human (Nerland)", "race", {
    description: "<p>Adaptable folk of Náirland.</p>",
    grants: grants({}),
  }),
  origin("sample-background-hunter", "Hunter", "background", {
    description: "<p>Free skill: Shoot. Growth deferred for POC.</p>",
    grants: grants({
      skills: [{ skillKey: "shoot", proficiency: "apprentice" }],
      specializations: [
        { skillKey: "survive", slug: "survive.tracking", label: "Tracking" },
      ],
    }),
  }),
  origin("sample-class-warrior", "Warrior", "class", {
    description: "<p>Martial class stub — HD and attack bonus for POC.</p>",
    hitDie: "1d10",
    attackBonus: 1,
    grants: grants({
      skills: [{ skillKey: "exert", proficiency: "apprentice" }],
    }),
  }),
  {
    sampleId: "sample-talent-alert",
    name: "Alert",
    type: "talent",
    img: "icons/svg/eye.svg",
    system: {
      description: "<p>Expert talent stub — Notice and a touch of Focus.</p>",
      grants: grants({
        skills: [{ skillKey: "notice", proficiency: "apprentice" }],
        abilities: [{ key: "foc", delta: 1 }],
      }),
    },
  },
];

export async function addSampleItems(actor: Actor.Implementation): Promise<number> {
  const existing = new Set(
    [...actor.items]
      .map((item) => (item.flags as { kedom?: { sampleId?: string } })?.kedom?.sampleId)
      .filter((id): id is string => Boolean(id)),
  );

  const toCreate = CREATION_SAMPLES.filter((sample) => !existing.has(sample.sampleId)).map(
    (sample) => ({
      name: sample.name,
      type: sample.type,
      img: sample.img,
      system: sample.system,
      flags: { kedom: { sampleId: sample.sampleId } },
    }),
  );

  if (toCreate.length === 0) {
    ui.notifications.warn(game.i18n.localize("KEDOM.Sheet.SamplesAlreadyAdded"));
    return 0;
  }

  // @ts-expect-error fvtt-types: origin/talent Item subtypes not in core union yet
  await actor.createEmbeddedDocuments("Item", toCreate);
  ui.notifications.info(
    game.i18n.format("KEDOM.Sheet.SamplesAdded", { count: String(toCreate.length) }),
  );
  return toCreate.length;
}
