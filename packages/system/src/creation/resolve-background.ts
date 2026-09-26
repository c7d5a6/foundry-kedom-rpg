import type { GrowthEntry, SkillGrantSpec } from "../config/creation.ts";
import { localizePersistedSpecLabel } from "../config/creation-spec-labels.ts";
import type { SkillKey } from "../config/kedom.ts";
import {
  SKILL_FIXED_SPECIALIZATIONS,
  SKILL_FREE_PARAMETER,
  SKILL_SPECIALIZATION_KIND,
  freeParameterSpecializationSlug,
  freeSpecializationSlug,
  specializationSlug,
} from "../config/specializations.ts";

export type ResolvedSkillGrant = {
  skillKey: SkillKey;
  specialization: { slug: string; label: string } | null;
};

export type ResolvePick = {
  skillKey: SkillKey | null;
  /** Label for free/parameterized, or fixed leaf key / display label. */
  specLabel: string | null;
};

const COMBAT_SKILLS: readonly SkillKey[] = ["punch", "shoot", "stab"];
const MAX_SAME_SKILL = 2;

export function grantKey(grant: ResolvedSkillGrant): string {
  return `${grant.skillKey}::${grant.specialization?.slug ?? ""}`;
}

export function countSkill(owned: readonly ResolvedSkillGrant[], skillKey: SkillKey): number {
  return owned.filter((g) => g.skillKey === skillKey).length;
}

/**
 * Blocked when the exact skill+specialization is already owned, or the skill
 * already appears MAX_SAME_SKILL times.
 */
export function isGrantBlocked(
  owned: readonly ResolvedSkillGrant[],
  candidate: ResolvedSkillGrant,
): boolean {
  if (countSkill(owned, candidate.skillKey) >= MAX_SAME_SKILL) return true;
  const key = grantKey(candidate);
  return owned.some((g) => grantKey(g) === key);
}

export function entrySkillKey(entry: GrowthEntry): SkillKey | null {
  return entry.kind === "skill" ? entry.skillKey : null;
}

export function grantFromSpec(spec: SkillGrantSpec): ResolvedSkillGrant {
  if (!spec.specLabel) {
    return { skillKey: spec.skillKey, specialization: null };
  }
  return {
    skillKey: spec.skillKey,
    specialization: buildSpecialization(spec.skillKey, spec.specLabel),
  };
}

export function buildSpecialization(
  skillKey: SkillKey,
  labelOrLeaf: string,
): { slug: string; label: string } {
  const kind = SKILL_SPECIALIZATION_KIND[skillKey];
  const trimmed = labelOrLeaf.trim();
  if (kind === "fixed") {
    const leaves = SKILL_FIXED_SPECIALIZATIONS[skillKey] ?? [];
    const leaf =
      leaves.find((l) => l === trimmed || l.toLowerCase() === trimmed.toLowerCase()) ??
      slugifyLoose(trimmed);
    return { slug: specializationSlug(skillKey, leaf), label: displaySpecLabel(skillKey, leaf) };
  }
  if (kind === "parameterized") {
    const param = SKILL_FREE_PARAMETER[skillKey] ?? "environment";
    const fixed = SKILL_FIXED_SPECIALIZATIONS[skillKey] ?? [];
    if (fixed.some((l) => l === trimmed || l.toLowerCase() === trimmed.toLowerCase())) {
      const leaf = fixed.find((l) => l.toLowerCase() === trimmed.toLowerCase()) ?? trimmed;
      return { slug: specializationSlug(skillKey, leaf), label: displaySpecLabel(skillKey, leaf) };
    }
    return {
      slug: freeParameterSpecializationSlug(skillKey, param, trimmed),
      label: trimmed,
    };
  }
  // free
  return { slug: freeSpecializationSlug(skillKey, trimmed), label: trimmed };
}

function displaySpecLabel(skillKey: SkillKey, leaf: string): string {
  const path = `KEDOM.Specialization.${skillKey}.${leaf}`;
  const v = typeof game !== "undefined" ? game.i18n?.localize?.(path) : undefined;
  if (v && v !== path) return v;
  // Title-case leaf fallback for tests without i18n
  return leaf.replace(/(^|[.])(\w)/g, (_, a: string, b: string) => a + b.toUpperCase());
}

function slugifyLoose(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replaceAll(/[^\p{L}\p{N}]+/gu, "")
    .slice(0, 32) || "custom";
}

export function skillNeedsSpecialization(skillKey: SkillKey): boolean {
  return SKILL_SPECIALIZATION_KIND[skillKey] !== "none";
}

export function resolveConcreteEntry(
  entry: GrowthEntry,
  pick: ResolvePick | null,
): ResolvedSkillGrant | null {
  if (entry.kind === "skill") {
    return grantFromSpec(entry);
  }
  if (entry.kind === "anyCombat") {
    if (!pick?.skillKey || !COMBAT_SKILLS.includes(pick.skillKey)) return null;
    return { skillKey: pick.skillKey, specialization: null };
  }
  if (entry.kind === "anySkill") {
    if (!pick?.skillKey) return null;
    return finalizeWildGrant(pick.skillKey, pick.specLabel);
  }
  return null;
}

function finalizeWildGrant(
  skillKey: SkillKey,
  specLabel: string | null,
): ResolvedSkillGrant | null {
  if (!skillNeedsSpecialization(skillKey)) {
    return { skillKey, specialization: null };
  }
  if (!specLabel?.trim()) return null;
  return {
    skillKey,
    specialization: buildSpecialization(skillKey, specLabel),
  };
}

export type RolledResolveState = {
  grant: ResolvedSkillGrant | null;
  /** Table entry as it would grant before substitution. */
  rolledGrant: ResolvedSkillGrant | null;
  needsCombatPick: boolean;
  needsAnySkill: boolean;
  needsSpecialization: boolean;
  substituted: boolean;
};

/**
 * Resolve a rolled (or chosen-as-roll) background table entry against already
 * owned grants. Exact skill+spec duplicates or a 3rd copy of a skill require
 * an any-skill substitute.
 */
export function resolveRolledEntry(
  entry: GrowthEntry,
  owned: readonly ResolvedSkillGrant[],
  pick: ResolvePick | null,
): RolledResolveState {
  if (entry.kind === "anyCombat") {
    if (!pick?.skillKey || !COMBAT_SKILLS.includes(pick.skillKey)) {
      // May be mid-substitute with a non-combat pick after a blocked combat pick.
      if (pick?.skillKey && !COMBAT_SKILLS.includes(pick.skillKey)) {
        const sub = finalizeWildGrant(pick.skillKey, pick.specLabel);
        if (!sub) {
          return {
            grant: null,
            rolledGrant: null,
            needsCombatPick: false,
            needsAnySkill: false,
            needsSpecialization: skillNeedsSpecialization(pick.skillKey),
            substituted: true,
          };
        }
        return {
          grant: sub,
          rolledGrant: null,
          needsCombatPick: false,
          needsAnySkill: false,
          needsSpecialization: false,
          substituted: true,
        };
      }
      return {
        grant: null,
        rolledGrant: null,
        needsCombatPick: true,
        needsAnySkill: false,
        needsSpecialization: false,
        substituted: false,
      };
    }
    const combatGrant: ResolvedSkillGrant = {
      skillKey: pick.skillKey,
      specialization: null,
    };
    if (isGrantBlocked(owned, combatGrant)) {
      // Combat pick blocked — need any-skill substitute (clear combat as interim).
      return {
        grant: null,
        rolledGrant: combatGrant,
        needsCombatPick: false,
        needsAnySkill: true,
        needsSpecialization: false,
        substituted: false,
      };
    }
    return {
      grant: combatGrant,
      rolledGrant: combatGrant,
      needsCombatPick: false,
      needsAnySkill: false,
      needsSpecialization: false,
      substituted: false,
    };
  }

  if (entry.kind === "anySkill") {
    if (!pick?.skillKey) {
      return {
        grant: null,
        rolledGrant: null,
        needsCombatPick: false,
        needsAnySkill: true,
        needsSpecialization: false,
        substituted: false,
      };
    }
    const grant = finalizeWildGrant(pick.skillKey, pick.specLabel);
    if (!grant) {
      return {
        grant: null,
        rolledGrant: null,
        needsCombatPick: false,
        needsAnySkill: false,
        needsSpecialization: true,
        substituted: false,
      };
    }
    if (isGrantBlocked(owned, grant)) {
      return {
        grant: null,
        rolledGrant: grant,
        needsCombatPick: false,
        needsAnySkill: true,
        needsSpecialization: false,
        substituted: false,
      };
    }
    return {
      grant,
      rolledGrant: grant,
      needsCombatPick: false,
      needsAnySkill: false,
      needsSpecialization: false,
      substituted: false,
    };
  }

  // concrete skill from table
  const rolledGrant = grantFromSpec(entry);
  if (!isGrantBlocked(owned, rolledGrant)) {
    return {
      grant: rolledGrant,
      rolledGrant,
      needsCombatPick: false,
      needsAnySkill: false,
      needsSpecialization: false,
      substituted: false,
    };
  }

  // Duplicate / over-cap → substitute
  if (!pick?.skillKey) {
    return {
      grant: null,
      rolledGrant,
      needsCombatPick: false,
      needsAnySkill: true,
      needsSpecialization: false,
      substituted: false,
    };
  }
  const sub = finalizeWildGrant(pick.skillKey, pick.specLabel);
  if (!sub) {
    return {
      grant: null,
      rolledGrant,
      needsCombatPick: false,
      needsAnySkill: false,
      needsSpecialization: skillNeedsSpecialization(pick.skillKey),
      substituted: true,
    };
  }
  return {
    grant: sub,
    rolledGrant,
    needsCombatPick: false,
    needsAnySkill: false,
    needsSpecialization: false,
    substituted: true,
  };
}

/** @deprecated Use resolveRolledEntry */
export function resolveRolledGrowth(
  entry: GrowthEntry,
  ownedSkillKeys: ReadonlySet<SkillKey>,
  wildPick: SkillKey | null,
): { grant: ResolvedSkillGrant | null; needsAnySkill: boolean; needsCombatPick: boolean } {
  const owned: ResolvedSkillGrant[] = [...ownedSkillKeys].map((skillKey) => ({
    skillKey,
    specialization: null,
  }));
  const state = resolveRolledEntry(entry, owned, wildPick ? { skillKey: wildPick, specLabel: null } : null);
  return {
    grant: state.grant,
    needsAnySkill: state.needsAnySkill,
    needsCombatPick: state.needsCombatPick,
  };
}

/** Merge resolved grants into skill update maps.
 * One grant → Apprentice; two grants of the same skill → Trained (+ both specs).
 */
export function mergeSkillGrants(grants: readonly ResolvedSkillGrant[]): {
  proficiency: Partial<Record<SkillKey, "apprentice" | "trained">>;
  specializations: Partial<
    Record<SkillKey, { slug: string; label: string; selected: boolean }[]>
  >;
} {
  const proficiency: Partial<Record<SkillKey, "apprentice" | "trained">> = {};
  const specializations: Partial<
    Record<SkillKey, { slug: string; label: string; selected: boolean }[]>
  > = {};
  const counts: Partial<Record<SkillKey, number>> = {};

  for (const g of grants) {
    counts[g.skillKey] = (counts[g.skillKey] ?? 0) + 1;
    if (g.specialization) {
      const list = specializations[g.skillKey] ?? [];
      if (!list.some((s) => s.slug === g.specialization!.slug)) {
        list.push({ ...g.specialization, selected: true });
        specializations[g.skillKey] = list;
      }
    }
  }

  for (const key of Object.keys(counts) as SkillKey[]) {
    const n = counts[key] ?? 0;
    proficiency[key] = n >= 2 ? "trained" : "apprentice";
  }

  return { proficiency, specializations };
}

export function formatGrantLabel(grant: ResolvedSkillGrant): string {
  const skillPath = `KEDOM.Skill.${grant.skillKey}`;
  const skill =
    typeof game !== "undefined" ? game.i18n?.localize?.(skillPath) : undefined;
  const skillLabel = skill && skill !== skillPath ? skill : grant.skillKey;
  if (!grant.specialization) return skillLabel;
  const spec = localizePersistedSpecLabel(
    grant.skillKey,
    grant.specialization.slug,
    grant.specialization.label,
  );
  return `${skillLabel} (${spec})`;
}

export { COMBAT_SKILLS, MAX_SAME_SKILL };
