/**
 * Effort pool and art slot budget — pure maths, no Foundry documents.
 *
 * max = max(abilityMods) + floor(max(skillProfBonuses) / 2)
 *       + (1 if Adventurer and both partials have Effort)
 * clamp min 1
 *
 * current = max − committed (scene/day/concentration each count 1 when active)
 */

export type EffortCommitment = "scene" | "day" | "concentration" | "free";

export type EffortArtCommit = {
  commitment: EffortCommitment | string;
  effortCommitted: boolean;
  concentrating: boolean;
};

export type DeriveEffortMaxInput = {
  /** Ability mods for Effort ability keys (empty → treat as 0). */
  abilityMods: readonly number[];
  /** Proficiency bonuses for Effort skills (empty → treat as 0). */
  skillProficiencyBonuses: readonly number[];
  /** Adventurer: +1 only when both partials have a non-empty Effort skill. */
  bothPartialsHaveEffort?: boolean;
};

export function deriveEffortMax(input: DeriveEffortMaxInput): number {
  const abilityMods = input.abilityMods;
  const skillBonuses = input.skillProficiencyBonuses;
  const maxAbility = abilityMods.length ? Math.max(...abilityMods) : 0;
  const maxSkill = skillBonuses.length ? Math.max(...skillBonuses) : 0;
  let max = maxAbility + Math.floor(maxSkill / 2);
  if (input.bothPartialsHaveEffort) max += 1;
  return Math.max(1, max);
}

export function countCommittedEffort(arts: readonly EffortArtCommit[]): number {
  let n = 0;
  for (const art of arts) {
    const c = art.commitment;
    if (c === "free") continue;
    if (c === "concentration") {
      if (art.concentrating) n += 1;
      continue;
    }
    if ((c === "scene" || c === "day") && art.effortCommitted) n += 1;
  }
  return n;
}

export function deriveEffortCurrent(
  max: number,
  arts: readonly EffortArtCommit[],
): number {
  return Math.max(0, max - countCommittedEffort(arts));
}

/** Sum slotsByLevel[0 .. level-1] (level is 1-based character level). */
export function artSlotBudget(slotsByLevel: readonly number[], level: number): number {
  const lvl = Math.max(0, Math.floor(level));
  let sum = 0;
  for (let i = 0; i < lvl && i < slotsByLevel.length; i++) {
    const n = slotsByLevel[i] ?? 0;
    sum += Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  }
  return sum;
}

/** Per-index sum of two 10-entry slot progressions (Adventurer). */
export function sumSlotsByLevel(
  a: readonly number[],
  b: readonly number[],
): number[] {
  const out = Array.from({ length: 10 }, () => 0);
  for (let i = 0; i < 10; i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    out[i] =
      (Number.isFinite(av) ? Math.max(0, Math.floor(av)) : 0) +
      (Number.isFinite(bv) ? Math.max(0, Math.floor(bv)) : 0);
  }
  return out;
}

export function normalizeSlotsByLevel(raw: readonly number[] | undefined): number[] {
  const out = Array.from({ length: 10 }, () => 0);
  if (!raw) return out;
  for (let i = 0; i < 10 && i < raw.length; i++) {
    const n = raw[i] ?? 0;
    out[i] = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  }
  return out;
}

/** Whether an art currently holds Effort. */
export function artHoldsEffort(art: EffortArtCommit): boolean {
  if (art.commitment === "free") return false;
  if (art.commitment === "concentration") return art.concentrating;
  if (art.commitment === "scene" || art.commitment === "day") return art.effortCommitted;
  return false;
}
