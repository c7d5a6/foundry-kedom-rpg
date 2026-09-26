import type { ProficiencyTier, SkillKey } from "./kedom.ts";
import { SAVE_KEYS, type SaveKey } from "./kedom.ts";

export const CREATION_ABILITY_KEYS = ["mgh", "dex", "kno", "foc", "pre", "lck"] as const;
export type CreationAbilityKey = (typeof CREATION_ABILITY_KEYS)[number];

/** Abilities that may be raised to 14 (Luck excluded). */
export const CREATION_REPLACEABLE_ABILITY_KEYS = ["mgh", "dex", "kno", "foc", "pre"] as const;

export type RegionKey = "nerland";

export type FeatureKey =
  | "killingBlow"
  | "veteransLuck"
  | "masterfulExpertise"
  | "humanExpertTalent"
  | "warriorTalentPicks"
  | "expertTalentPicks"
  | "adventurerTalentPicks";

export type TalentPickBudget = {
  warrior?: number;
  expert?: number;
  any?: number;
};

/** Starting save proficiency for reflex / fortitude / will / luck. */
export type ClassSaveProficiencies = Record<SaveKey | "luck", ProficiencyTier>;

export type CultureDef = {
  key: string;
  /** i18n path under KEDOM.Creation.Culture.{key} */
  labelKey: string;
  allowedClassKeys: readonly string[];
  /** When false, shown disabled in the wizard (POC lock). */
  available?: boolean;
  talentPicks?: TalentPickBudget;
  raceFeatures?: readonly FeatureKey[];
};

export type ClassDef = {
  key: string;
  labelKey: string;
  hitDie: string;
  talentPicks: TalentPickBudget;
  classFeatures: readonly FeatureKey[];
  saveProficiencies: ClassSaveProficiencies;
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

function saves(
  trained: ReadonlyArray<SaveKey | "luck">,
): ClassSaveProficiencies {
  const out: ClassSaveProficiencies = {
    reflex: "apprentice",
    fortitude: "apprentice",
    will: "apprentice",
    luck: "apprentice",
  };
  for (const key of trained) out[key] = "trained";
  return out;
}

export const CLASSES: ReadonlyArray<ClassDef> = [
  {
    key: "warrior",
    labelKey: "KEDOM.Creation.Class.warrior",
    hitDie: "1d6+2",
    classFeatures: ["killingBlow", "veteransLuck", "warriorTalentPicks"],
    talentPicks: { any: 1, warrior: 1 },
    saveProficiencies: saves(["reflex", "fortitude"]),
  },
  {
    key: "expert",
    labelKey: "KEDOM.Creation.Class.expert",
    hitDie: "1d6",
    classFeatures: ["masterfulExpertise", "expertTalentPicks"],
    talentPicks: { any: 1, expert: 1 },
    saveProficiencies: saves(["reflex", "luck"]),
  },
  {
    key: "adventurer",
    labelKey: "KEDOM.Creation.Class.adventurer",
    hitDie: "1d6",
    classFeatures: ["killingBlow", "adventurerTalentPicks"],
    talentPicks: { expert: 1, warrior: 1, any: 1 },
    saveProficiencies: saves(["reflex", "fortitude"]),
  },
];

export const CULTURES_BY_REGION: Record<RegionKey, readonly CultureDef[]> = {
  nerland: [
    {
      key: "human_nerlander",
      labelKey: "KEDOM.Creation.Culture.human_nerlander",
      /** POC: warrior, expert, adventurer (warrior/expert). */
      allowedClassKeys: ["warrior", "expert", "adventurer"],
      available: true,
      talentPicks: { expert: 1 },
      raceFeatures: ["humanExpertTalent"],
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

/** Actor `system.saves` payload from class starting proficiencies. */
export function classSaveSystemData(
  classDef: ClassDef,
): Record<SaveKey | "luck", { proficiency: ProficiencyTier }> {
  const out = {} as Record<SaveKey | "luck", { proficiency: ProficiencyTier }>;
  for (const key of [...SAVE_KEYS, "luck"] as const) {
    out[key] = { proficiency: classDef.saveProficiencies[key] };
  }
  return out;
}

/** Merge race + class talent pick budgets (additive per pool). */
export function resolveTalentPickBudget(
  culture: CultureDef | undefined,
  classDef: ClassDef | undefined,
): Required<TalentPickBudget> {
  const race = culture?.talentPicks ?? {};
  const cls = classDef?.talentPicks ?? {};
  return {
    warrior: (race.warrior ?? 0) + (cls.warrior ?? 0),
    expert: (race.expert ?? 0) + (cls.expert ?? 0),
    any: (race.any ?? 0) + (cls.any ?? 0),
  };
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
