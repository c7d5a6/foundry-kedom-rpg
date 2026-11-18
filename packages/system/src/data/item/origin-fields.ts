import type { GrantsFields } from "./grants.ts";
import type { OriginSubtype } from "../../config/origin.ts";

/** Save tracks a class may train (class saves + Luck). */
export const CLASS_SAVE_TRACKS = ["reflex", "fortitude", "will", "luck"] as const;
export type ClassSaveTrack = (typeof CLASS_SAVE_TRACKS)[number];

export interface PrioritizedSaveFields {
  save: ClassSaveTrack;
  priority: number;
}

export interface ClassArtsFields {
  /** Optional: class origins authored before the arts block gained a skill key lack it. */
  skillKey?: string;
  abilityKeys: string[];
  /** Levels 1–10: arts that may be known at that level (budget display). */
  slotsByLevel: number[];
  receiveTableKey: string;
  artKeys: string[];
}

/** Culture entry nested on a region origin. */
export interface RegionCultureFields {
  slug: string;
  weight: number;
  backgroundSlugs: string[];
}

export interface BackgroundSkillPickFields {
  skillKey: string;
  specSlug: string;
}

/** Plain origin system fields (no Foundry dependency — safe for unit tests). */
export interface OriginDataFields {
  subType: OriginSubtype;
  slug: string;
  description: string;
  grants: GrantsFields;
  /** Region only. */
  cultures: RegionCultureFields[];
  /** Race (culture) only — single talent. Also legacy single class talent. */
  talentSlug: string;
  /** Class only — ordered granted talents (preferred). */
  talentSlugs: string[];
  classSlugs: string[];
  /** Background only. */
  free: BackgroundSkillPickFields;
  growth: BackgroundSkillPickFields[];
  /** Class only. */
  isFull: boolean;
  hitDie: string;
  hitDiePriority: number;
  talentPicks: { warrior: number; expert: number; any: number };
  arts: ClassArtsFields;
  saves: {
    primary: PrioritizedSaveFields;
    secondary: PrioritizedSaveFields;
  };
  /**
   * Region only: Foundry image path for the character sheet banner.
   * Empty → sheet uses the system default banner art.
   */
  bannerImg: string;
}

/**
 * An origin as read from a compendium pack. Pack YAML is authored by hand and by Forge exports,
 * so the descriptive and catalog fields below can be absent even though the schema declares them.
 */
export type PackOriginFields = Omit<
  OriginDataFields,
  "description" | "free" | "growth" | "cultures"
> &
  Partial<Pick<OriginDataFields, "description" | "free" | "growth">> & {
    cultures?: (Omit<RegionCultureFields, "backgroundSlugs"> & { backgroundSlugs?: string[] })[];
  };

/** Class granted talents: prefer talentSlugs[]; fall back to legacy talentSlug. */
export function classTalentSlugs(system: {
  talentSlugs?: readonly string[] | null;
  talentSlug?: string | null;
}): string[] {
  const fromArray = (system.talentSlugs ?? []).map((s) => s.trim()).filter(Boolean);
  if (fromArray.length) return [...new Set(fromArray)];
  const legacy = (system.talentSlug ?? "").trim();
  return legacy ? [legacy] : [];
}

export type { OriginSubtype, GrantsFields };
