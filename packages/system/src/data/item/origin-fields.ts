import type { GrantsFields } from "./grants.ts";
import type { OriginSubtype } from "../../config/origin.ts";

/** Save tracks a class may train (class saves + Luck). */
export const CLASS_SAVE_TRACKS = ["reflex", "fortitude", "will", "luck"] as const;
export type ClassSaveTrack = (typeof CLASS_SAVE_TRACKS)[number];

export type PrioritizedSaveFields = {
  save: ClassSaveTrack;
  priority: number;
};

export type ClassArtsFields = {
  skillKey: string;
  abilityKeys: string[];
  receiveTableKey: string;
  artKeys: string[];
};

/** Culture entry nested on a region origin. */
export type RegionCultureFields = {
  slug: string;
  weight: number;
  backgroundSlugs: string[];
};

export type BackgroundSkillPickFields = {
  skillKey: string;
  specSlug: string;
};

/** Plain origin system fields (no Foundry dependency — safe for unit tests). */
export type OriginDataFields = {
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
