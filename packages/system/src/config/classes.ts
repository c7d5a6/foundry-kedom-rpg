/**
 * Hardcoded class roster for the Foundry system.
 *
 * Shape follows the class-entry notes in the Kedom slip-box: full vs partial as
 * separate rows, hit die + priority, class talents, talent picks, arts/Effort,
 * and primary / secondary saves with priority. Adventurer is not a row — it is
 * two partials combined via {@link combinePartials}.
 *
 * Only Warrior and Expert (full + partial) are authored here for now.
 * There is no class attack progression in Kedom.
 */

import type { AbilityKey, ProficiencyTier, SaveKey, SkillKey } from "./kedom.ts";

/** Distinct class rows: full and partial of the same family are different classes. */
export const CLASS_KEYS = [
  "warrior",
  "warriorPartial",
  "expert",
  "expertPartial",
] as const;

export type ClassKey = (typeof CLASS_KEYS)[number];

/** Display-title family (shared by a full class and its partial counterpart). */
export const CLASS_TITLE_KEYS = ["warrior", "expert"] as const;
export type ClassTitleKey = (typeof CLASS_TITLE_KEYS)[number];

/** Class save tracks: the three class saves, plus Luck where a class trains it. */
export type ClassSaveTrack = SaveKey | "luck";

/** Forge / content slug (kebab) for the class family. */
export const CLASS_SLUG: Record<ClassKey, string> = {
  warrior: "warrior",
  warriorPartial: "warrior",
  expert: "expert",
  expertPartial: "expert",
};

export type PrioritizedHitDie = {
  /** Dice expression, e.g. `1d6+2`. */
  formula: string;
  /** Higher wins when two partials combine. */
  priority: number;
};

export type PrioritizedSave = {
  save: ClassSaveTrack;
  priority: number;
};

export type ClassSaves = {
  primary: PrioritizedSave;
  secondary: PrioritizedSave;
};

export type TalentPickBudget = {
  warrior?: number;
  expert?: number;
  any?: number;
};

/**
 * Effort / arts block. Magical classes fill this; martial classes leave it null.
 * Nested fields stay null until arts content is authored (Q12).
 */
export type ClassArts = {
  skillKey: SkillKey | null;
  /** Casting / art attributes (normally two). */
  abilityKeys: readonly AbilityKey[];
  /** Key of the arts-receive progression table; null until authored. */
  receiveTableKey: string | null;
  /** Art keys granted by this class; empty until authored. */
  artKeys: readonly string[];
};

/** One authored class row. Full and partial variants are separate entries. */
export type ClassEntry = {
  key: ClassKey;
  /** i18n path for the display title — shared across full/partial of a family. */
  labelKey: `KEDOM.Class.${ClassTitleKey}`;
  /** True = standalone full class; false = Adventurer half only. */
  isFull: boolean;
  hitDie: PrioritizedHitDie;
  classTalentKeys: readonly string[];
  talentPicks: TalentPickBudget;
  arts: ClassArts | null;
  saves: ClassSaves;
};

/** Resolved Adventurer (two partials). Not stored in {@link CLASSES}. */
export type CombinedClass = {
  partialKeys: readonly [ClassKey, ClassKey];
  labelKeys: readonly [ClassEntry["labelKey"], ClassEntry["labelKey"]];
  hitDie: PrioritizedHitDie;
  classTalentKeys: readonly string[];
  talentPicks: Required<TalentPickBudget>;
  arts: {
    skillKey: SkillKey | null;
    abilityKeys: readonly AbilityKey[];
    receiveTables: readonly {
      partialKey: ClassKey;
      receiveTableKey: string | null;
      artKeys: readonly string[];
    }[];
  };
  saves: ClassSaves;
};

export const CLASSES: readonly ClassEntry[] = [
  {
    key: "warrior",
    labelKey: "KEDOM.Class.warrior",
    isFull: true,
    hitDie: { formula: "1d6+2", priority: 1000 },
    classTalentKeys: ["killingBlow", "veteransLuck"],
    talentPicks: { any: 1, warrior: 1 },
    arts: null,
    saves: {
      primary: { save: "reflex", priority: 1000 },
      secondary: { save: "fortitude", priority: 1000 },
    },
  },
  {
    key: "warriorPartial",
    labelKey: "KEDOM.Class.warrior",
    isFull: false,
    hitDie: { formula: "1d6+2", priority: 1000 },
    classTalentKeys: ["killingBlow"],
    talentPicks: { warrior: 1 },
    arts: null,
    saves: {
      primary: { save: "reflex", priority: 1000 },
      secondary: { save: "fortitude", priority: 1000 },
    },
  },
  {
    key: "expert",
    labelKey: "KEDOM.Class.expert",
    isFull: true,
    hitDie: { formula: "1d6", priority: 500 },
    classTalentKeys: ["masterfulExpertise"],
    talentPicks: { any: 1, expert: 1 },
    arts: null,
    saves: {
      primary: { save: "reflex", priority: 500 },
      secondary: { save: "luck", priority: 500 },
    },
  },
  {
    key: "expertPartial",
    labelKey: "KEDOM.Class.expert",
    isFull: false,
    hitDie: { formula: "1d6", priority: 500 },
    classTalentKeys: ["masterfulExpertise"],
    talentPicks: { expert: 1, any: 1 },
    arts: null,
    saves: {
      primary: { save: "reflex", priority: 500 },
      secondary: { save: "luck", priority: 500 },
    },
  },
];

const BY_KEY: ReadonlyMap<ClassKey, ClassEntry> = new Map(
  CLASSES.map((c) => [c.key, c]),
);

export function getClassEntry(key: string): ClassEntry | undefined {
  return BY_KEY.get(key as ClassKey);
}

export function fullClasses(): readonly ClassEntry[] {
  return CLASSES.filter((c) => c.isFull);
}

export function partialClasses(): readonly ClassEntry[] {
  return CLASSES.filter((c) => !c.isFull);
}

function mergeTalentPicks(a: TalentPickBudget, b: TalentPickBudget): Required<TalentPickBudget> {
  return {
    warrior: (a.warrior ?? 0) + (b.warrior ?? 0),
    expert: (a.expert ?? 0) + (b.expert ?? 0),
    any: (a.any ?? 0) + (b.any ?? 0),
  };
}

function pickHitDie(a: ClassEntry, b: ClassEntry): PrioritizedHitDie {
  return a.hitDie.priority >= b.hitDie.priority ? a.hitDie : b.hitDie;
}

/**
 * Adventurer saves: each partial's primary; if both primaries match, take the
 * secondary with higher priority (caller may still offer a player pick when
 * primaries collide — see docs Q30).
 */
function combineSaves(a: ClassEntry, b: ClassEntry): ClassSaves {
  const primaryA = a.saves.primary;
  const primaryB = b.saves.primary;
  if (primaryA.save !== primaryB.save) {
    const main = primaryA.priority >= primaryB.priority ? primaryA : primaryB;
    const secondary = primaryA.priority >= primaryB.priority ? primaryB : primaryA;
    return { primary: main, secondary };
  }
  const secondary =
    a.saves.secondary.priority >= b.saves.secondary.priority
      ? a.saves.secondary
      : b.saves.secondary;
  return { primary: primaryA, secondary };
}

function combineArts(a: ClassEntry, b: ClassEntry): CombinedClass["arts"] {
  const artsA = a.arts;
  const artsB = b.arts;
  const abilityKeys = [...new Set([...(artsA?.abilityKeys ?? []), ...(artsB?.abilityKeys ?? [])])];
  const skillKey = artsA?.skillKey ?? artsB?.skillKey ?? null;
  return {
    skillKey,
    abilityKeys,
    receiveTables: [
      {
        partialKey: a.key,
        receiveTableKey: artsA?.receiveTableKey ?? null,
        artKeys: artsA?.artKeys ?? [],
      },
      {
        partialKey: b.key,
        receiveTableKey: artsB?.receiveTableKey ?? null,
        artKeys: artsB?.artKeys ?? [],
      },
    ],
  };
}

/**
 * Combine two partial class rows into an Adventurer chassis.
 * Returns null when either key is missing or is a full class.
 */
export function combinePartials(
  firstKey: ClassKey,
  secondKey: ClassKey,
): CombinedClass | null {
  const a = getClassEntry(firstKey);
  const b = getClassEntry(secondKey);
  if (!a || !b) return null;
  if (a.isFull || b.isFull) return null;

  return {
    partialKeys: [a.key, b.key],
    labelKeys: [a.labelKey, b.labelKey],
    hitDie: pickHitDie(a, b),
    classTalentKeys: [...a.classTalentKeys, ...b.classTalentKeys],
    talentPicks: mergeTalentPicks(a.talentPicks, b.talentPicks),
    arts: combineArts(a, b),
    saves: combineSaves(a, b),
  };
}

function emptySaveProficiencies(): Record<ClassSaveTrack, ProficiencyTier> {
  return {
    reflex: "apprentice",
    fortitude: "apprentice",
    will: "apprentice",
    luck: "apprentice",
  };
}

/** Starting save proficiency map (primary + secondary → trained). */
export function classSaveProficiencies(
  entry: ClassEntry,
): Record<ClassSaveTrack, ProficiencyTier> {
  const out = emptySaveProficiencies();
  out[entry.saves.primary.save] = "trained";
  out[entry.saves.secondary.save] = "trained";
  return out;
}

/** Same for a combined Adventurer. */
export function combinedSaveProficiencies(
  combined: CombinedClass,
): Record<ClassSaveTrack, ProficiencyTier> {
  const out = emptySaveProficiencies();
  out[combined.saves.primary.save] = "trained";
  out[combined.saves.secondary.save] = "trained";
  return out;
}

/** Assert every {@link CLASS_KEYS} member has a row (dev / test gate). */
export function assertClassRosterComplete(): void {
  for (const key of CLASS_KEYS) {
    if (!BY_KEY.has(key)) {
      throw new Error(`Missing class row for ${key}`);
    }
  }
}
