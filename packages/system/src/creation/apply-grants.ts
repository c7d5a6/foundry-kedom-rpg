import {
  PROFICIENCY_TIERS,
  type AbilityKey,
  type ProficiencyTier,
  type SkillKey,
} from "../config/kedom.ts";
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

function readItemGrants(item: Item.Implementation): GrantsFields | null {
  const type = item.type as string;
  if (type === "origin") {
    const system = item.system as unknown as OriginDataFields;
    return system.grants ?? { skills: [], specializations: [], abilities: [] };
  }
  if (type === "talent") {
    const system = item.system as unknown as TalentDataFields;
    return system.grants ?? { skills: [], specializations: [], abilities: [] };
  }
  return null;
}

type AppliedAbilityDeltas = Record<string, number>;

function abilityDeltaKey(itemId: string, abilityKey: string): string {
  return `${itemId}:${abilityKey}`;
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
 * Apply grants from all owned origin + talent items onto the actor.
 * Skills take the max proficiency; specializations merge by slug;
 * ability baseMod deltas apply once per item+ability (tracked in flags).
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
  const flags = (
    actor.flags as {
      kedom?: { grantsApplied?: string; appliedAbilityDeltas?: AppliedAbilityDeltas };
    }
  ).kedom ?? {};

  if (flags.grantsApplied === stableFingerprint) {
    ui.notifications.warn(game.i18n.localize("KEDOM.Sheet.GrantsAlreadyApplied"));
    return { applied: false, skillsUpdated: 0, specsAdded: 0, abilitiesUpdated: 0 };
  }

  const system = actor.system as CharacterData;
  const skillsUpdate: Record<string, unknown> = {};
  let skillsUpdated = 0;
  let specsAdded = 0;

  const skillGrantsByKey = new Map<SkillKey, ProficiencyTier>();
  const specGrantsByKey = new Map<SkillKey, { slug: string; label: string }[]>();

  for (const item of grantItems) {
    const grants = readItemGrants(item);
    if (!grants) continue;
    for (const sg of grants.skills ?? []) {
      const key = sg.skillKey as SkillKey;
      const prev = skillGrantsByKey.get(key);
      skillGrantsByKey.set(
        key,
        prev ? maxProficiencyTier(prev, sg.proficiency) : (sg.proficiency as ProficiencyTier),
      );
    }
    for (const spec of grants.specializations ?? []) {
      const key = spec.skillKey as SkillKey;
      const list = specGrantsByKey.get(key) ?? [];
      list.push({ slug: spec.slug, label: spec.label });
      specGrantsByKey.set(key, list);
    }
  }

  const skills = system.skills as Record<SkillKey, SkillFields>;
  for (const [key, grantedTier] of skillGrantsByKey) {
    const current = skills[key];
    if (!current) continue;
    const next = maxProficiencyTier(current.proficiency, grantedTier);
    if (next !== current.proficiency) {
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
      const key = ag.key as AbilityKey;
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
    flags: {
      kedom: {
        grantsApplied: stableFingerprint,
        appliedAbilityDeltas: appliedDeltas,
      },
    },
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
