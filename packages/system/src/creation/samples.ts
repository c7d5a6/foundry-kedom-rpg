import type { GrantsFields } from "../data/item/grants.ts";
import type { OriginSubtype } from "../config/origin.ts";
import type { TalentCategory } from "../config/talent.ts";
export type SampleItemData = {
  name: string;
  type: "origin" | "talent";
  /** Stable id used to detect already-added samples on an actor. */
  sampleId: string;
  img?: string;
  system: Record<string, unknown>;
  effects?: Record<string, unknown>[];
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
    system: { subType, description: "", hitDie: "1d6", ...system },
  };
}

function talent(
  sampleId: string,
  name: string,
  category: TalentCategory,
  system: Record<string, unknown>,
  extras?: { img?: string; effects?: Record<string, unknown>[] },
): SampleItemData {
  return {
    sampleId,
    name,
    type: "talent",
    img: extras?.img ?? "icons/svg/aura.svg",
    system: { category, featureKey: "", grants: grants({}), ...system },
    effects: extras?.effects,
  };
}

/** Hand-authored demo items for POC character create (no compendium). */
export const CREATION_SAMPLES: SampleItemData[] = [
  origin("sample-race-human-nerland", "Human (Nerland)", "race", {
    description: "<p>Adaptable folk of Náirland — +1 Expert talent pick.</p>",
    grants: grants({}),
  }),
  origin("sample-background-hunter", "Hunter", "background", {
    description: "<p>Free skill: Shoot. Growth deferred for POC.</p>",
    grants: grants({
      skills: [{ skillKey: "shoot", proficiency: "apprentice" }],
      specializations: [{ skillKey: "survive", slug: "survive.tracking", label: "Tracking" }],
    }),
  }),
  talent(
    "sample-talent-alert",
    "Alert",
    "warrior",
    {
      description: "<p>Warrior-pool talent stub — a touch of Focus.</p>",
      grants: grants({
        abilities: [{ key: "foc", delta: 1 }],
      }),
    },
    { img: "icons/svg/eye.svg" },
  ),
  {
    sampleId: "sample-talent-gifted-chirurgeon",
    name: "Gifted Chirurgeon",
    type: "talent",
    img: "icons/svg/blood.svg",
    system: {
      description:
        "<p>Expert-pool talent — advantage on Heal checks via Active Effect (no proficiency grant).</p>",
      category: "skills",
      featureKey: "",
      grants: grants({}),
    },
    effects: [
      {
        name: "Heal Advantage",
        img: "icons/svg/upgrade.svg",
        transfer: true,
        disabled: false,
        changes: [
          {
            key: "system.skills.heal.defaultAdvantage",
            type: "add",
            value: "1",
            priority: 20,
          },
        ],
      },
    ],
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
      ...(sample.effects?.length ? { effects: sample.effects } : {}),
    }),
  );

  if (toCreate.length === 0) {
    ui.notifications.warn(game.i18n.localize("KEDOM.Sheet.SamplesAlreadyAdded"));
    return 0;
  }

  // @ts-expect-error fvtt-types: origin/talent subtypes
  await actor.createEmbeddedDocuments("Item", toCreate);
  ui.notifications.info(
    game.i18n.format("KEDOM.Sheet.SamplesAdded", { count: String(toCreate.length) }),
  );
  return toCreate.length;
}
