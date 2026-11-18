import { ABILITY_KEYS, SKILL_KEYS } from "../../../config/kedom.ts";
import type {
  CatalogBackground,
  CatalogClass,
  CatalogCulture,
  CatalogItemPayload,
  CatalogRegion,
  OriginsCatalog,
} from "../../../creation/origins-catalog.ts";
import type { mergeSkillGrants } from "../../../creation/resolve-background.ts";

/** Ability values for the new actor; an unrolled ability falls back to 10. */
export function buildAbilityData(
  abilities: Readonly<Record<string, number | null | undefined>>,
): Record<string, { value: number }> {
  const out: Record<string, { value: number }> = {};
  for (const key of ABILITY_KEYS) {
    out[key] = { value: abilities[key] ?? 10 };
  }
  return out;
}

/** Skill proficiencies and specializations for the new actor; untouched skills are omitted. */
export function buildSkillData(
  merged: ReturnType<typeof mergeSkillGrants>,
): Record<string, unknown> {
  const skills: Record<string, unknown> = {};
  for (const key of SKILL_KEYS) {
    const prof = merged.proficiency[key];
    const specs = merged.specializations[key];
    if (!prof && !specs) continue;
    skills[key] = {
      ...(prof ? { proficiency: prof } : {}),
      ...(specs ? { specializations: specs } : {}),
    };
  }
  return skills;
}

function pushTalentPayload(
  items: CatalogItemPayload[],
  catalog: OriginsCatalog,
  talentSlug: string,
  seen: Set<string>,
): void {
  if (!talentSlug || seen.has(talentSlug)) return;
  const payload = catalog.talentBySlug.get(talentSlug);
  if (!payload) return;
  seen.add(talentSlug);
  items.push(payload);
}

function pushClassOrigin(
  items: CatalogItemPayload[],
  catalog: OriginsCatalog,
  cls: CatalogClass,
): void {
  const payload = catalog.originBySlug.get(cls.slug);
  if (payload) {
    items.push(payload);
    return;
  }
  items.push({
    name: cls.name,
    type: "origin",
    img: "icons/svg/combat.svg",
    system: {
      subType: "class",
      slug: cls.slug,
      description: cls.description,
      isFull: cls.isFull,
    },
  });
}

function pushClassOrigins(
  items: CatalogItemPayload[],
  catalog: OriginsCatalog,
  fullClass: CatalogClass | undefined,
  partials: readonly CatalogClass[],
): void {
  if (fullClass) pushClassOrigin(items, catalog, fullClass);
  else {
    for (const p of partials) pushClassOrigin(items, catalog, p);
  }
}

function regionFallback(slug: string, name: string, description: string): CatalogItemPayload {
  return {
    name,
    type: "origin",
    img: "icons/svg/village.svg",
    system: { subType: "region", slug, description },
  };
}

function cultureFallback(slug: string, culture: CatalogCulture): CatalogItemPayload {
  return {
    name: culture.name,
    type: "origin",
    img: "icons/svg/mystery-man.svg",
    system: { subType: "race", slug, description: culture.description },
  };
}

function backgroundFallback(slug: string, background: CatalogBackground): CatalogItemPayload {
  return {
    name: background.name,
    type: "origin",
    img: "icons/svg/book.svg",
    system: { subType: "background", slug, description: background.description },
  };
}

export interface OriginItemsInput {
  regionKey: string;
  cultureKey: string;
  backgroundKey: string;
  region: CatalogRegion | undefined;
  /** Display name used for the region item when the catalog has no payload. */
  regionLabel: string;
  culture: CatalogCulture;
  background: CatalogBackground;
  fullClass: CatalogClass | undefined;
  partials: readonly CatalogClass[];
  talentSlugs: readonly string[];
}

/**
 * Origin and talent items embedded in the new actor. Pack-backed catalogs reuse the packs'
 * payloads (falling back to a built stub); the static catalog always builds stubs and skips talents.
 */
export function buildOriginItems(
  catalog: OriginsCatalog,
  input: OriginItemsInput,
): CatalogItemPayload[] {
  const { regionKey, cultureKey, backgroundKey, region, regionLabel, culture, background } = input;
  const items: CatalogItemPayload[] = [];

  if (catalog.fromPacks) {
    const regionPayload = catalog.originBySlug.get(regionKey);
    const racePayload = catalog.originBySlug.get(cultureKey);
    const bgPayload = catalog.originBySlug.get(backgroundKey);
    if (regionPayload) items.push(regionPayload);
    else if (region) items.push(regionFallback(regionKey, regionLabel, region.description));
    items.push(racePayload ?? cultureFallback(cultureKey, culture));
    items.push(bgPayload ?? backgroundFallback(backgroundKey, background));
    pushClassOrigins(items, catalog, input.fullClass, input.partials);
    const seenTalents = new Set<string>();
    pushTalentPayload(items, catalog, culture.talentSlug, seenTalents);
    for (const slug of input.talentSlugs) {
      pushTalentPayload(items, catalog, slug, seenTalents);
    }
    return items;
  }

  items.push(
    regionFallback(regionKey, regionLabel, region?.description ?? ""),
    cultureFallback(cultureKey, culture),
    backgroundFallback(backgroundKey, background),
  );
  pushClassOrigins(items, catalog, input.fullClass, input.partials);
  return items;
}
