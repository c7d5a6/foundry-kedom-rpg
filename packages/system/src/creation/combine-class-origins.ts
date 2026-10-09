/**
 * Adventurer maths: combine two partial class origin systems.
 * Pure — no document reads.
 */

import type {
  ClassSaveTrack,
  OriginDataFields,
  PrioritizedSaveFields,
} from "../data/item/origin-fields.ts";
import { classTalentSlugs } from "../data/item/origin-fields.ts";
import type { ProficiencyTier } from "../config/kedom.ts";
import { normalizeSlotsByLevel, sumSlotsByLevel } from "../derivations/effort.ts";

export type CombinedClassOrigin = {
  partialSlugs: readonly [string, string];
  names: readonly [string, string];
  hitDie: string;
  hitDiePriority: number;
  talentPicks: OriginDataFields["talentPicks"];
  talentSlugs: readonly string[];
  arts: {
    /** Union of non-empty Effort skill keys from both partials. */
    skillKeys: readonly string[];
    abilityKeys: readonly string[];
    /** Per-level sum of both partials' slotsByLevel. */
    slotsByLevel: readonly number[];
    /** True when both partials have a non-empty Effort skillKey. */
    bothPartialsHaveEffort: boolean;
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
    warrior: Math.max(a.warrior, b.warrior),
    expert: Math.max(a.expert, b.expert),
    any: Math.max(a.any, b.any),
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
  const secondary = a.secondary.priority >= b.secondary.priority ? a.secondary : b.secondary;
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
  const skillA = (a.arts.skillKey ?? "").trim();
  const skillB = (b.arts.skillKey ?? "").trim();
  const skillKeys = [...new Set([skillA, skillB].filter(Boolean))];
  return {
    partialSlugs: [a.slug, b.slug],
    names: [aName, bName],
    hitDie: hd.hitDie,
    hitDiePriority: hd.hitDiePriority,
    talentPicks: mergeTalentPicks(a.talentPicks, b.talentPicks),
    talentSlugs: [...new Set([...classTalentSlugs(a), ...classTalentSlugs(b)])],
    arts: {
      skillKeys,
      abilityKeys: [...new Set([...a.arts.abilityKeys, ...b.arts.abilityKeys])],
      slotsByLevel: sumSlotsByLevel(
        normalizeSlotsByLevel(a.arts.slotsByLevel),
        normalizeSlotsByLevel(b.arts.slotsByLevel),
      ),
      bothPartialsHaveEffort: Boolean(skillA && skillB),
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
