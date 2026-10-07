/**
 * Class origin Item create-data (until Forge → pack YAML owns them).
 * Shape matches `origin` items with `subType: "class"`.
 */

import type { OriginDataFields } from "../data/item/origin-fields.ts";
import type { GrantsFields } from "../data/item/grants.ts";

function emptyGrants(): GrantsFields {
  return { skills: [], specializations: [], abilities: [] };
}

export type ClassOriginCreateData = {
  name: string;
  type: "origin";
  img: string;
  system: OriginDataFields;
};

function emptyArts(): OriginDataFields["arts"] {
  return { skillKey: "", abilityKeys: [], receiveTableKey: "", artKeys: [] };
}

function emptyGrowth(): OriginDataFields["growth"] {
  return Array.from({ length: 8 }, () => ({ skillKey: "", specSlug: "" }));
}

function classOrigin(
  slug: string,
  name: string,
  fields: Pick<
    OriginDataFields,
    "isFull" | "hitDie" | "hitDiePriority" | "classTalentKeys" | "talentPicks" | "saves"
  > & {
    description?: string;
    arts?: OriginDataFields["arts"];
    talentSlug?: string;
  },
): ClassOriginCreateData {
  return {
    name,
    type: "origin",
    img: "icons/svg/mystery-man.svg",
    system: {
      subType: "class",
      slug,
      description: fields.description ?? "",
      grants: emptyGrants(),
      cultures: [],
      talentSlug: fields.talentSlug ?? "",
      classSlugs: [],
      free: { skillKey: "", specSlug: "" },
      growth: emptyGrowth(),
      isFull: fields.isFull,
      hitDie: fields.hitDie,
      hitDiePriority: fields.hitDiePriority,
      classTalentKeys: fields.classTalentKeys,
      talentPicks: fields.talentPicks,
      arts: fields.arts ?? emptyArts(),
      saves: fields.saves,
    },
  };
}

/** Warrior / Expert full + partial — the only authored class items for now. */
export const CLASS_ORIGIN_SEEDS: readonly ClassOriginCreateData[] = [
  classOrigin("warrior", "Warrior", {
    isFull: true,
    hitDie: "1d6+2",
    hitDiePriority: 1000,
    classTalentKeys: ["killingBlow", "veteransLuck"],
    talentPicks: { warrior: 1, expert: 0, any: 1 },
    saves: {
      primary: { save: "reflex", priority: 1000 },
      secondary: { save: "fortitude", priority: 1000 },
    },
    description: "<p>Full Warrior — HD 1d6+2, Killing Blow, Veteran's Luck.</p>",
  }),
  classOrigin("warrior-partial", "Warrior", {
    isFull: false,
    hitDie: "1d6+2",
    hitDiePriority: 1000,
    classTalentKeys: ["killingBlow"],
    talentPicks: { warrior: 1, expert: 0, any: 0 },
    saves: {
      primary: { save: "reflex", priority: 1000 },
      secondary: { save: "fortitude", priority: 1000 },
    },
    description: "<p>Warrior partial for Adventurer.</p>",
  }),
  classOrigin("expert", "Expert", {
    isFull: true,
    hitDie: "1d6",
    hitDiePriority: 500,
    classTalentKeys: ["masterfulExpertise"],
    talentPicks: { warrior: 0, expert: 1, any: 1 },
    saves: {
      primary: { save: "reflex", priority: 500 },
      secondary: { save: "luck", priority: 500 },
    },
    description: "<p>Full Expert — HD 1d6, Masterful Expertise.</p>",
  }),
  classOrigin("expert-partial", "Expert", {
    isFull: false,
    hitDie: "1d6",
    hitDiePriority: 500,
    classTalentKeys: ["masterfulExpertise"],
    talentPicks: { warrior: 0, expert: 1, any: 1 },
    saves: {
      primary: { save: "reflex", priority: 500 },
      secondary: { save: "luck", priority: 500 },
    },
    description: "<p>Expert partial for Adventurer.</p>",
  }),
];

const BY_SLUG: ReadonlyMap<string, ClassOriginCreateData> = new Map(
  CLASS_ORIGIN_SEEDS.map((c) => [c.system.slug, c]),
);

export function getClassOrigin(slug: string): ClassOriginCreateData | undefined {
  return BY_SLUG.get(slug);
}

export function fullClassOrigins(): readonly ClassOriginCreateData[] {
  return CLASS_ORIGIN_SEEDS.filter((c) => c.system.isFull);
}

export function partialClassOrigins(): readonly ClassOriginCreateData[] {
  return CLASS_ORIGIN_SEEDS.filter((c) => !c.system.isFull);
}
