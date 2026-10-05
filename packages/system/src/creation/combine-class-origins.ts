/**
 * Adventurer maths: combine two partial class origin systems.
 * Pure — no document reads.
 */

import type {
  ClassSaveTrack,
  OriginDataFields,
  PrioritizedSaveFields,
} from "../data/item/origin-fields.ts";
import type { ProficiencyTier } from "../config/kedom.ts";
import { getClassOrigin } from "./class-origins.ts";

export type CombinedClassOrigin = {
  partialSlugs: readonly [string, string];
  names: readonly [string, string];
  hitDie: string;
  hitDiePriority: number;
  classTalentKeys: readonly string[];
  talentPicks: OriginDataFields["talentPicks"];
  arts: {
    skillKey: string;
    abilityKeys: readonly string[];
    receiveTables: readonly {
      partialSlug: string;
      receiveTableKey: string;
      artKeys: readonly string[];
    }[];
  };
  saves: OriginDataFields["saves"];
};

function mergeTalentPicks(
  a: OriginDataFields["talentPicks"],
  b: OriginDataFields["talentPicks"],
): OriginDataFields["talentPicks"] {
  return {
    warrior: a.warrior + b.warrior,
    expert: a.expert + b.expert,
    any: a.any + b.any,
  };
}

function pickHitDie(
  a: OriginDataFields,
  b: OriginDataFields,
): { hitDie: string; hitDiePriority: number } {
  if (a.hitDiePriority >= b.hitDiePriority) {
    return { hitDie: a.hitDie, hitDiePriority: a.hitDiePriority };
  }
  return { hitDie: b.hitDie, hitDiePriority: b.hitDiePriority };
}

function combineSaves(
  a: OriginDataFields["saves"],
  b: OriginDataFields["saves"],
): OriginDataFields["saves"] {
  const primaryA = a.primary;
  const primaryB = b.primary;
  if (primaryA.save !== primaryB.save) {
    const main: PrioritizedSaveFields =
      primaryA.priority >= primaryB.priority ? primaryA : primaryB;
    const secondary: PrioritizedSaveFields =
      primaryA.priority >= primaryB.priority ? primaryB : primaryA;
    return { primary: main, secondary };
  }
  const secondary =
    a.secondary.priority >= b.secondary.priority ? a.secondary : b.secondary;
  return { primary: primaryA, secondary };
}

/**
 * Combine two partial class origin systems.
 * Returns null when either is missing, not a class, or is a full class.
 */
export function combineClassOrigins(
  a: OriginDataFields,
  aName: string,
  b: OriginDataFields,
  bName: string,
): CombinedClassOrigin | null {
  if (a.subType !== "class" || b.subType !== "class") return null;
  if (a.isFull || b.isFull) return null;
  if (!a.slug || !b.slug) return null;

  const hd = pickHitDie(a, b);
  return {
    partialSlugs: [a.slug, b.slug],
    names: [aName, bName],
    hitDie: hd.hitDie,
    hitDiePriority: hd.hitDiePriority,
    classTalentKeys: [...a.classTalentKeys, ...b.classTalentKeys],
    talentPicks: mergeTalentPicks(a.talentPicks, b.talentPicks),
    arts: {
      skillKey: a.arts.skillKey || b.arts.skillKey,
      abilityKeys: [...new Set([...a.arts.abilityKeys, ...b.arts.abilityKeys])],
      receiveTables: [
        {
          partialSlug: a.slug,
          receiveTableKey: a.arts.receiveTableKey,
          artKeys: a.arts.artKeys,
        },
        {
          partialSlug: b.slug,
          receiveTableKey: b.arts.receiveTableKey,
          artKeys: b.arts.artKeys,
        },
      ],
    },
    saves: combineSaves(a.saves, b.saves),
  };
}

/** Combine by slug from {@link getClassOrigin} seeds. */
export function combineClassOriginsBySlug(
  firstSlug: string,
  secondSlug: string,
): CombinedClassOrigin | null {
  const a = getClassOrigin(firstSlug);
  const b = getClassOrigin(secondSlug);
  if (!a || !b) return null;
  return combineClassOrigins(a.system, a.name, b.system, b.name);
}

function emptySaveProficiencies(): Record<ClassSaveTrack, ProficiencyTier> {
  return {
    reflex: "apprentice",
    fortitude: "apprentice",
    will: "apprentice",
    luck: "apprentice",
  };
}

export function originSaveProficiencies(
  system: OriginDataFields,
): Record<ClassSaveTrack, ProficiencyTier> {
  const out = emptySaveProficiencies();
  out[system.saves.primary.save] = "trained";
  out[system.saves.secondary.save] = "trained";
  return out;
}

export function combinedOriginSaveProficiencies(
  combined: CombinedClassOrigin,
): Record<ClassSaveTrack, ProficiencyTier> {
  const out = emptySaveProficiencies();
  out[combined.saves.primary.save] = "trained";
  out[combined.saves.secondary.save] = "trained";
  return out;
}
