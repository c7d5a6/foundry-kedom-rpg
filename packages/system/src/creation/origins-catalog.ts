/**
 * Origins / talents catalog for the create wizard.
 * Prefer Foundry packs (`kedom.origins`, `kedom.talents`); fall back to draft config.
 */
import type { OriginDataFields } from "../data/item/origin-fields.ts";
import type { TalentDataFields } from "../data/item/talent.ts";
import {
  CULTURES_BY_REGION,
  REGIONS,
  classDefFromOriginFields,
  type ClassDef,
  type GrowthEntry,
  type RegionKey,
} from "../config/creation.ts";
import {
  backgroundsForRegion,
  getBackground as getDraftBackground,
} from "../config/backgrounds-draft.ts";
import { getCulture as getDraftCulture } from "../config/creation.ts";
import { SKILL_KEYS, type SkillKey } from "../config/kedom.ts";
import { localizeContentDescription, localizeContentLabel } from "../i18n/content-labels.ts";

export type CatalogCulture = {
  slug: string;
  name: string;
  weight: number;
  /** Display percentage (sums to 100 across the region). */
  percent: number;
  description: string;
  talentSlug: string;
  classSlugs: string[];
  backgroundSlugs: string[];
  disabled: boolean;
};

export type CatalogRegion = {
  slug: string;
  name: string;
  description: string;
  cultures: CatalogCulture[];
};

export type CatalogBackground = {
  slug: string;
  name: string;
  description: string;
  free: GrowthEntry;
  growth: GrowthEntry[];
};

export type CatalogClass = {
  slug: string;
  name: string;
  description: string;
  hitDie: string;
  talentSlug: string;
  isFull: boolean;
  def: ClassDef | null;
};

export type CatalogTalent = {
  slug: string;
  name: string;
  description: string;
  featureKey: string;
};

/** Plain item payload for Actor.create embeds (no item `_id`). Effects are copied through. */
export type CatalogItemPayload = {
  name: string;
  type: string;
  img: string;
  system: Record<string, unknown>;
  effects?: Record<string, unknown>[];
};

export type OriginsCatalog = {
  fromPacks: boolean;
  regions: CatalogRegion[];
  backgrounds: Map<string, CatalogBackground>;
  classes: CatalogClass[];
  talents: Map<string, CatalogTalent>;
  originBySlug: Map<string, CatalogItemPayload>;
  talentBySlug: Map<string, CatalogItemPayload>;
};

/**
 * Floor percentages so they sum to 100; remainder goes to the last positive-weight entry.
 */
export function culturePercents(weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) return weights.map(() => 0);
  const raw = weights.map((w) => (100 * w) / sum);
  const floored = raw.map((x) => Math.floor(x));
  let rem = 100 - floored.reduce((a, b) => a + b, 0);
  for (let i = floored.length - 1; i >= 0 && rem > 0; i--) {
    if (weights[i]! > 0) {
      floored[i]! += rem;
      rem = 0;
    }
  }
  return floored;
}

let cache: Promise<OriginsCatalog> | null = null;

/** Drop cached catalog (tests / pack reload). */
export function clearOriginsCatalogCache(): void {
  cache = null;
}

/** Load catalog from packs when present; otherwise draft config. Cached after first call. */
export function loadOriginsCatalog(): Promise<OriginsCatalog> {
  if (!cache) {
    cache = buildCatalog();
  }
  return cache;
}

async function packDocuments(packName: string): Promise<Item.Implementation[]> {
  if (typeof game === "undefined" || !game.packs) return [];
  const pack = game.packs.get(packName);
  if (!pack) return [];
  try {
    const docs = await pack.getDocuments();
    return docs as Item.Implementation[];
  } catch (err) {
    console.warn(`Kedom: failed to load pack ${packName}`, err);
    return [];
  }
}

function itemType(doc: Item.Implementation): string {
  return String(doc.type);
}

function originSystem(doc: Item.Implementation): OriginDataFields | null {
  if (itemType(doc) !== "origin") return null;
  return doc.system as unknown as OriginDataFields;
}

function talentSystem(doc: Item.Implementation): TalentDataFields | null {
  if (itemType(doc) !== "talent") return null;
  return doc.system as unknown as TalentDataFields;
}

function slugOf(doc: Item.Implementation, system: { slug?: string }): string {
  if (system.slug?.trim()) return system.slug.trim();
  const fromName = doc.name?.slugify?.({ strict: true });
  if (fromName) return fromName;
  return doc.id ?? "unknown";
}

function toPayload(doc: Item.Implementation): CatalogItemPayload {
  const raw = doc.toObject() as {
    name?: string;
    type?: string;
    img?: string;
    system?: Record<string, unknown>;
    effects?: Record<string, unknown>[];
  };
  const payload: CatalogItemPayload = {
    name: raw.name ?? doc.name ?? "",
    type: raw.type ?? itemType(doc),
    img: raw.img ?? doc.img ?? "icons/svg/item-bag.svg",
    system: { ...(raw.system ?? {}) },
  };
  if (raw.effects && raw.effects.length > 0) payload.effects = raw.effects;
  return payload;
}

function pickToGrowth(pick: { skillKey?: string; specSlug?: string }): GrowthEntry {
  const raw = (pick.skillKey ?? "").trim();
  if (raw === "anyCombat") return { kind: "anyCombat" };
  if (raw === "anySkill") return { kind: "anySkill" };
  const skillKey = raw as SkillKey;
  const valid = SKILL_KEYS.includes(skillKey);
  const key = valid ? skillKey : ("lore" as SkillKey);
  const spec = pick.specSlug?.trim();
  // Catalog packs may store full slugs (`notice.awareness`) or English freeform labels.
  // resolve-background.buildSpecialization normalizes both forms.
  if (spec) return { kind: "skill", skillKey: key, specLabel: spec };
  return { kind: "skill", skillKey: key };
}

function indexTalents(talentDocs: Item.Implementation[]): {
  talents: Map<string, CatalogTalent>;
  talentBySlug: Map<string, CatalogItemPayload>;
} {
  const talents = new Map<string, CatalogTalent>();
  const talentBySlug = new Map<string, CatalogItemPayload>();

  for (const doc of talentDocs) {
    const sys = talentSystem(doc);
    if (!sys) continue;
    const slug = slugOf(doc, sys);
    const packDesc = sys.description ?? "";
    const entry: CatalogTalent = {
      slug,
      name: localizeContentLabel("Talent", slug, doc.name ?? slug),
      description: localizeContentDescription("Talent", slug, packDesc),
      featureKey: sys.featureKey ?? "",
    };
    talents.set(slug, entry);
    talentBySlug.set(slug, toPayload(doc));
    if (sys.featureKey && !talents.has(sys.featureKey)) {
      talents.set(sys.featureKey, entry);
    }
  }

  return { talents, talentBySlug };
}

async function buildCatalog(): Promise<OriginsCatalog> {
  const [originDocs, talentDocs] = await Promise.all([
    packDocuments("kedom.origins"),
    packDocuments("kedom.talents"),
  ]);

  const { talents, talentBySlug } = indexTalents(talentDocs);

  const regionDocs = originDocs.filter((d) => originSystem(d)?.subType === "region");
  if (regionDocs.length > 0) {
    return buildFromPacks(originDocs, talents, talentBySlug);
  }

  return buildFromDraft(talents, talentBySlug);
}

function buildFromPacks(
  originDocs: Item.Implementation[],
  talents: Map<string, CatalogTalent>,
  talentBySlug: Map<string, CatalogItemPayload>,
): OriginsCatalog {
  const bgDocs = originDocs.filter((d) => originSystem(d)?.subType === "background");
  const raceDocs = originDocs.filter((d) => originSystem(d)?.subType === "race");
  const classDocs = originDocs.filter((d) => originSystem(d)?.subType === "class");
  const regionDocs = originDocs.filter((d) => originSystem(d)?.subType === "region");

  const originBySlug = new Map<string, CatalogItemPayload>();
  for (const doc of originDocs) {
    const sys = originSystem(doc);
    if (!sys) continue;
    originBySlug.set(sys.slug || slugOf(doc, sys), toPayload(doc));
  }

  const backgrounds = new Map<string, CatalogBackground>();
  for (const doc of bgDocs) {
    const sys = originSystem(doc)!;
    const slug = sys.slug || slugOf(doc, sys);
    const packDesc = sys.description ?? "";
    backgrounds.set(slug, {
      slug,
      name: localizeContentLabel("Background", slug, doc.name ?? slug),
      description: localizeContentDescription("Background", slug, packDesc),
      free: pickToGrowth(sys.free ?? { skillKey: "", specSlug: "" }),
      growth: (sys.growth ?? []).map((g) => pickToGrowth(g)),
    });
  }

  const raceBySlug = new Map<string, Item.Implementation>();
  for (const doc of raceDocs) {
    const sys = originSystem(doc)!;
    raceBySlug.set(sys.slug || slugOf(doc, sys), doc);
  }

  const regions: CatalogRegion[] = regionDocs.map((doc) => {
    const sys = originSystem(doc)!;
    const entries = sys.cultures ?? [];
    const weights = entries.map((c) => c.weight);
    const pcts = culturePercents(weights);
    const cultures: CatalogCulture[] = entries.map((c, i) => {
      const race = raceBySlug.get(c.slug);
      const raceSys = race ? originSystem(race) : null;
      const raceSlug = raceSys?.slug || c.slug;
      const raceDesc = raceSys?.description ?? "";
      return {
        slug: c.slug,
        name: localizeContentLabel("Culture", raceSlug, race?.name ?? c.slug),
        weight: c.weight,
        percent: pcts[i] ?? 0,
        description: localizeContentDescription("Culture", raceSlug, raceDesc),
        talentSlug: raceSys?.talentSlug ?? "",
        classSlugs: raceSys?.classSlugs ?? [],
        backgroundSlugs: c.backgroundSlugs ?? [],
        disabled: false,
      };
    });
    const regionSlug = sys.slug || slugOf(doc, sys);
    const regionDesc = sys.description ?? "";
    return {
      slug: regionSlug,
      name: localizeContentLabel("Region", regionSlug, doc.name ?? regionSlug),
      description: localizeContentDescription("Region", regionSlug, regionDesc),
      cultures,
    };
  });

  const classes: CatalogClass[] = classDocs.map((doc) => {
    const sys = originSystem(doc)!;
    const slug = sys.slug || slugOf(doc, sys);
    const def = classDefFromOriginFields(sys, slug);
    const packDesc = sys.description ?? "";
    return {
      slug,
      name: localizeContentLabel("Class", slug, doc.name ?? slug),
      description: localizeContentDescription("Class", slug, packDesc),
      hitDie: def.hitDie,
      talentSlug: sys.talentSlug ?? "",
      isFull: sys.isFull !== false,
      def,
    };
  });

  return {
    fromPacks: true,
    regions,
    backgrounds,
    classes,
    talents,
    originBySlug,
    talentBySlug,
  };
}

function localizeLabel(path: string, fallback: string): string {
  if (typeof game === "undefined") return fallback;
  const v = game.i18n?.localize?.(path);
  if (!v || v === path) return fallback;
  return v;
}

function buildFromDraft(
  talents: Map<string, CatalogTalent>,
  talentBySlug: Map<string, CatalogItemPayload>,
): OriginsCatalog {
  const backgrounds = new Map<string, CatalogBackground>();
  for (const r of REGIONS) {
    for (const b of backgroundsForRegion(r.key)) {
      backgrounds.set(b.key, {
        slug: b.key,
        name: localizeLabel(b.labelKey, b.key),
        description: "",
        free: b.free,
        growth: [...b.growth],
      });
    }
  }

  const regions: CatalogRegion[] = REGIONS.map((r) => {
    const culturesRaw = CULTURES_BY_REGION[r.key] ?? [];
    const weights = culturesRaw.map(() => 1);
    const pcts = culturePercents(weights);
    return {
      slug: r.key,
      name: localizeLabel(r.labelKey, r.key),
      description: "",
      cultures: culturesRaw.map((c, i) => ({
        slug: c.key,
        name: localizeLabel(c.labelKey, c.key),
        weight: 1,
        percent: pcts[i] ?? 0,
        description: "",
        talentSlug: "",
        classSlugs: [...c.allowedClassKeys],
        backgroundSlugs: backgroundsForRegion(r.key).map((b) => b.key),
        disabled: c.available === false,
      })),
    };
  });

  const classes: CatalogClass[] = [];

  return {
    fromPacks: false,
    regions,
    backgrounds,
    classes,
    talents,
    originBySlug: new Map(),
    talentBySlug,
  };
}

export function getCatalogRegion(catalog: OriginsCatalog, slug: string): CatalogRegion | undefined {
  return catalog.regions.find((r) => r.slug === slug);
}

export function getCatalogCulture(
  catalog: OriginsCatalog,
  regionSlug: string,
  cultureSlug: string,
): CatalogCulture | undefined {
  return getCatalogRegion(catalog, regionSlug)?.cultures.find((c) => c.slug === cultureSlug);
}

export function getCatalogBackground(
  catalog: OriginsCatalog,
  backgroundSlug: string,
): CatalogBackground | undefined {
  return catalog.backgrounds.get(backgroundSlug);
}

export function getCatalogClass(
  catalog: OriginsCatalog,
  classSlug: string,
): CatalogClass | undefined {
  return catalog.classes.find((c) => c.slug === classSlug);
}

export function getCatalogTalent(
  catalog: OriginsCatalog,
  talentSlug: string,
): CatalogTalent | undefined {
  if (!talentSlug) return undefined;
  return catalog.talents.get(talentSlug);
}

export function draftBackground(regionKey: RegionKey, key: string) {
  return getDraftBackground(regionKey, key);
}

export function draftCulture(regionKey: RegionKey, key: string) {
  return getDraftCulture(regionKey, key);
}
