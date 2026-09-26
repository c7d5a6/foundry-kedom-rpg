import type { SkillKey } from "./kedom.ts";

export const CREATION_ABILITY_KEYS = ["mgh", "dex", "kno", "foc", "pre", "lck"] as const;
export type CreationAbilityKey = (typeof CREATION_ABILITY_KEYS)[number];

/** Abilities that may be raised to 14 (Luck excluded). */
export const CREATION_REPLACEABLE_ABILITY_KEYS = ["mgh", "dex", "kno", "foc", "pre"] as const;

export type RegionKey = "nerland";

export type CultureDef = {
  key: string;
  /** i18n path under KEDOM.Creation.Culture.{key} */
  labelKey: string;
  allowedClassKeys: readonly string[];
  /** When false, shown disabled in the wizard (POC lock). */
  available?: boolean;
};

export type ClassDef = {
  key: string;
  labelKey: string;
  hitDie: string;
  attackBonus: number;
};

export type SkillGrantSpec = {
  skillKey: SkillKey;
  /** Optional specialization display label (free-form or fixed leaf). */
  specLabel?: string;
};

export type GrowthEntry =
  | ({ kind: "skill" } & SkillGrantSpec)
  | { kind: "anyCombat" }
  | { kind: "anySkill" };

export type BackgroundDef = {
  key: string;
  labelKey: string;
  free: GrowthEntry;
  /** Exactly 8 growth table rows (1d8). */
  growth: readonly [
    GrowthEntry,
    GrowthEntry,
    GrowthEntry,
    GrowthEntry,
    GrowthEntry,
    GrowthEntry,
    GrowthEntry,
    GrowthEntry,
  ];
};

export const REGIONS: ReadonlyArray<{ key: RegionKey; labelKey: string }> = [
  { key: "nerland", labelKey: "KEDOM.Creation.Region.nerland" },
];

export const CLASSES: ReadonlyArray<ClassDef> = [
  { key: "warrior", labelKey: "KEDOM.Creation.Class.warrior", hitDie: "1d10", attackBonus: 1 },
  { key: "expert", labelKey: "KEDOM.Creation.Class.expert", hitDie: "1d6", attackBonus: 0 },
  { key: "mage", labelKey: "KEDOM.Creation.Class.mage", hitDie: "1d6", attackBonus: 0 },
  {
    key: "adventurer",
    labelKey: "KEDOM.Creation.Class.adventurer",
    hitDie: "1d8",
    attackBonus: 0,
  },
];

export const CULTURES_BY_REGION: Record<RegionKey, readonly CultureDef[]> = {
  nerland: [
    {
      key: "human_nerlander",
      labelKey: "KEDOM.Creation.Culture.human_nerlander",
      /** POC: warrior, expert, adventurer (warrior/expert). Mage deferred. */
      allowedClassKeys: ["warrior", "expert", "adventurer"],
      available: true,
    },
    {
      key: "dwarf",
      labelKey: "KEDOM.Creation.Culture.dwarf",
      allowedClassKeys: ["warrior", "expert", "adventurer"],
      available: false,
    },
    {
      key: "halfling",
      labelKey: "KEDOM.Creation.Culture.halfling",
      allowedClassKeys: ["adventurer"],
      available: false,
    },
  ],
};

export function getCulture(regionKey: RegionKey, cultureKey: string): CultureDef | undefined {
  return CULTURES_BY_REGION[regionKey]?.find((c) => c.key === cultureKey);
}

export function getClass(classKey: string): ClassDef | undefined {
  return CLASSES.find((c) => c.key === classKey);
}

export function roll3d6(): number {
  return (
    1 + Math.floor(Math.random() * 6) +
    1 + Math.floor(Math.random() * 6) +
    1 + Math.floor(Math.random() * 6)
  );
}

export function roll1d8(): number {
  return 1 + Math.floor(Math.random() * 8);
}

export function roll1d20(): number {
  return 1 + Math.floor(Math.random() * 20);
}
