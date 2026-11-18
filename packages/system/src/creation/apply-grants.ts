import { systemOf, characterData } from "../types/accessors.ts";
import { PROFICIENCY_TIERS, type ProficiencyTier, type SkillKey } from "../config/kedom.ts";
import { clampProficiencyToLevel, proficiencyRank } from "../config/proficiency-gates.ts";
import type { CharacterData, SkillFields, SkillSpecialization } from "../data/actor/character.ts";
import type { GrantsFields } from "../data/item/grants.ts";
import type { TalentDataFields } from "../data/item/talent.ts";
import type { OriginDataFields } from "../data/item/origin.ts";

const TIER_RANK = Object.fromEntries(
  PROFICIENCY_TIERS.map((tier, index) => [tier, index]),
) as Record<ProficiencyTier, number>;

/** Higher proficiency wins; unknown tiers treated as untrained. */
export function maxProficiencyTier(a: string, b: string): ProficiencyTier {
  const ra = TIER_RANK[a as ProficiencyTier] ?? 0;
  const rb = TIER_RANK[b as ProficiencyTier] ?? 0;
  return PROFICIENCY_TIERS[Math.max(ra, rb)] ?? "untrained";
}

export function mergeSpecializationGrants(
  existing: SkillSpecialization[],
  grants: { slug: string; label: string }[],
): SkillSpecialization[] {
  const bySlug = new Map(existing.map((s) => [s.slug, { ...s }]));
  for (const g of grants) {
    if (!g.slug) continue;
    const prev = bySlug.get(g.slug);
    if (prev) {
      bySlug.set(g.slug, {
        ...prev,
        label: g.label || prev.label,
        selected: true,
      });
    } else {
      bySlug.set(g.slug, {
        slug: g.slug,
        label: g.label || g.slug,
        selected: true,
      });
    }
  }
  return [...bySlug.values()];
}

/** fvtt-types does not know the `kedom` flag scope yet. */
function kedomFlagsPatch(patch: object): never {
  return { kedom: patch } as never;
}

type AppliedAbilityDeltas = Record<string, number>;

function abilityDeltaKey(itemId: string, abilityKey: string): string {
  return `${itemId}:${abilityKey}`;
}

function readItemGrants(item: Item.Implementation): GrantsFields | null {
  const type = item.type as string;
  if (type === "origin") {
    const system = systemOf<OriginDataFields>(item);
    return system.grants ?? { skills: [], specializations: [], abilities: [] };
  }
  if (type === "talent") {
    const system = systemOf<TalentDataFields>(item);
    return system.grants ?? { skills: [], specializations: [], abilities: [] };
  }
  return null;
}

function characterLevel(actor: Actor.Implementation): number {
  const details = (actor.system as CharacterData & { details?: { level?: number } }).details;
  return Math.max(1, Math.floor(details?.level ?? 1));
}

function kedomFlags(actor: Actor.Implementation): {
  grantsApplied?: string;
  appliedAbilityDeltas?: AppliedAbilityDeltas;
} {
  return (
    (
      actor.flags as {
        kedom?: {
          grantsApplied?: string;
          appliedAbilityDeltas?: AppliedAbilityDeltas;
        };
      }
    ).kedom ?? {}
  );
}

function buildFingerprint(items: Item.Implementation[]): string {
  return JSON.stringify(
    items.map((item) => ({
      id: item.id,
      type: item.type,
      grants: readItemGrants(item),
    })),
  );
}

/**
 * Pure: baseMod corrections and remaining delta map after an item's grants are removed.
 * Only deltas recorded in `applied` under `${itemId}:` are reversed.
 */
export function planAbilityGrantRevert(
  applied: AppliedAbilityDeltas,
  itemId: string,
): { baseModDeltas: Record<string, number>; remaining: AppliedAbilityDeltas } {
  const prefix = `${itemId}:`;
  const baseModDeltas: Record<string, number> = {};
  const remaining: AppliedAbilityDeltas = {};
  for (const [flagKey, delta] of Object.entries(applied)) {
    if (flagKey.startsWith(prefix)) {
      baseModDeltas[flagKey.slice(prefix.length)] = -delta;
    } else {
      remaining[flagKey] = delta;
    }
  }
  return { baseModDeltas, remaining };
}

/** Undo the ability `baseMod` bumps an item granted (call when it is deleted). */
export async function revertItemAbilityGrants(
  actor: Actor.Implementation,
  item: Item.Implementation,
): Promise<void> {
  if (!item.id) return;
  const flags = kedomFlags(actor);
  const { baseModDeltas, remaining } = planAbilityGrantRevert(
    flags.appliedAbilityDeltas ?? {},
    item.id,
  );
  const keys = Object.keys(baseModDeltas);
  if (keys.length === 0) return;

  const system = characterData(actor);
  const update: Record<string, unknown> = {};
  for (const key of keys) {
    const ability = (system.abilities as Record<string, { baseMod?: number } | undefined>)[key];
    if (!ability) continue;
    update[`system.abilities.${key}.baseMod`] =
      Math.floor(ability.baseMod ?? 0) + (baseModDeltas[key] ?? 0);
  }
  await actor.update({
    ...update,
    flags: kedomFlagsPatch({ ...flags, appliedAbilityDeltas: remaining }),
  });
}

/**
 * Apply ability deltas from a newly-added talent.
 * Talents do not grant skill proficiency — use Active Effects for advantage/etc.
 */
export async function applyTalentAbilityGrants(
  actor: Actor.Implementation,
  talent: Item.Implementation,
): Promise<{ skillsUpdated: number; specsAdded: number; abilitiesUpdated: number }> {
  if ((talent.type as string) !== "talent" || !talent.id) {
    return { skillsUpdated: 0, specsAdded: 0, abilitiesUpdated: 0 };
  }
  const grants = readItemGrants(talent);
  if (!grants) return { skillsUpdated: 0, specsAdded: 0, abilitiesUpdated: 0 };

  const flags = kedomFlags(actor);
  const appliedDeltas: AppliedAbilityDeltas = { ...(flags.appliedAbilityDeltas ?? {}) };
  let abilitiesUpdated = 0;
  const abilityUpdate: Record<string, unknown> = {};
  const system = characterData(actor);

  for (const ag of grants.abilities ?? []) {
    const key = ag.key;
    const delta = Math.floor(ag.delta ?? 0);
    if (delta === 0) continue;
    const flagKey = abilityDeltaKey(talent.id, key);
    const already = appliedDeltas[flagKey] ?? 0;
    const add = delta - already;
    if (add === 0) continue;
    const ability = (system.abilities as Record<string, { baseMod?: number }>)[key];
    const baseMod = Math.floor(ability?.baseMod ?? 0) + add;
    abilityUpdate[`system.abilities.${key}.baseMod`] = baseMod;
    appliedDeltas[flagKey] = delta;
    abilitiesUpdated += 1;
  }

  if (abilitiesUpdated === 0) {
    return { skillsUpdated: 0, specsAdded: 0, abilitiesUpdated: 0 };
  }

  await actor.update({
    ...abilityUpdate,
    flags: kedomFlagsPatch({ ...flags, appliedAbilityDeltas: appliedDeltas }),
  });

  ui.notifications.info(
    game.i18n.format("KEDOM.Sheet.GrantsApplied", {
      skills: "0",
      specs: "0",
      abilities: String(abilitiesUpdated),
    }),
  );

  return { skillsUpdated: 0, specsAdded: 0, abilitiesUpdated };
}

/**
 * Apply grants from owned origin (+ talent ability deltas) onto the actor.
 * Skill / specialization proficiency grants come from **origin** items only.
 */
export async function applyGrants(actor: Actor.Implementation): Promise<{
  applied: boolean;
  skillsUpdated: number;
  specsAdded: number;
  abilitiesUpdated: number;
}> {
  const grantItems = [...actor.items].filter((item) => {
    const t = item.type as string;
    return t === "origin" || t === "talent";
  });

  const stableFingerprint = buildFingerprint(grantItems);
  const flags = kedomFlags(actor);

  if (flags.grantsApplied === stableFingerprint) {
    ui.notifications.warn(game.i18n.localize("KEDOM.Sheet.GrantsAlreadyApplied"));
    return { applied: false, skillsUpdated: 0, specsAdded: 0, abilitiesUpdated: 0 };
  }

  const level = characterLevel(actor);
  const system = characterData(actor);
  const skillsUpdate: Record<string, unknown> = {};
  let skillsUpdated = 0;
  let specsAdded = 0;

  const skillGrantsByKey = new Map<SkillKey, ProficiencyTier>();
  const specGrantsByKey = new Map<SkillKey, { slug: string; label: string }[]>();

  for (const item of grantItems) {
    // Talents do not grant skill proficiency or specializations.
    if ((item.type as string) === "talent") continue;
    const grants = readItemGrants(item);
    if (!grants || !item.id) continue;
    for (const sg of grants.skills ?? []) {
      const key = sg.skillKey;
      const prev = skillGrantsByKey.get(key);
      skillGrantsByKey.set(key, prev ? maxProficiencyTier(prev, sg.proficiency) : sg.proficiency);
    }
    for (const spec of grants.specializations ?? []) {
      const key = spec.skillKey;
      const list = specGrantsByKey.get(key) ?? [];
      list.push({ slug: spec.slug, label: spec.label });
      specGrantsByKey.set(key, list);
    }
  }

  const skills = system.skills as Record<SkillKey, SkillFields>;
  for (const [key, grantedTier] of skillGrantsByKey) {
    const current = skills[key];
    if (!current) continue;
    const desired = maxProficiencyTier(current.proficiency, grantedTier);
    const next = clampProficiencyToLevel(desired, level);
    if (
      next !== current.proficiency &&
      proficiencyRank(next) > proficiencyRank(current.proficiency)
    ) {
      skillsUpdate[`system.skills.${key}.proficiency`] = next;
      skillsUpdated += 1;
    }
  }

  for (const [key, grantedSpecs] of specGrantsByKey) {
    const current = skills[key];
    if (!current) continue;
    const beforeCount = current.specializations.length;
    const merged = mergeSpecializationGrants(current.specializations, grantedSpecs);
    const changed =
      merged.length !== beforeCount ||
      JSON.stringify(merged) !== JSON.stringify(current.specializations);
    if (changed) {
      skillsUpdate[`system.skills.${key}.specializations`] = merged;
      specsAdded += Math.max(0, merged.length - beforeCount);
    }
  }

  const appliedDeltas: AppliedAbilityDeltas = { ...(flags.appliedAbilityDeltas ?? {}) };
  let abilitiesUpdated = 0;
  const abilityUpdate: Record<string, unknown> = {};

  for (const item of grantItems) {
    const grants = readItemGrants(item);
    if (!grants || !item.id) continue;
    for (const ag of grants.abilities ?? []) {
      const key = ag.key;
      const delta = Math.floor(ag.delta ?? 0);
      if (delta === 0) continue;
      const flagKey = abilityDeltaKey(item.id, key);
      const already = appliedDeltas[flagKey] ?? 0;
      const add = delta - already;
      if (add === 0) continue;
      const ability = (system.abilities as Record<string, { baseMod?: number }>)[key];
      const baseMod = Math.floor(ability?.baseMod ?? 0) + add;
      abilityUpdate[`system.abilities.${key}.baseMod`] = baseMod;
      appliedDeltas[flagKey] = delta;
      abilitiesUpdated += 1;
    }
  }

  await actor.update({
    ...skillsUpdate,
    ...abilityUpdate,
    flags: kedomFlagsPatch({
      grantsApplied: stableFingerprint,
      appliedAbilityDeltas: appliedDeltas,
    }),
  });

  ui.notifications.info(
    game.i18n.format("KEDOM.Sheet.GrantsApplied", {
      skills: String(skillsUpdated),
      specs: String(specsAdded),
      abilities: String(abilitiesUpdated),
    }),
  );

  return {
    applied: true,
    skillsUpdated,
    specsAdded,
    abilitiesUpdated,
  };
}
