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

/** Plain origin system fields (no Foundry dependency — safe for unit tests). */
export type OriginDataFields = {
  subType: OriginSubtype;
  slug: string;
  description: string;
  grants: GrantsFields;
  isFull: boolean;
  hitDie: string;
  hitDiePriority: number;
  classTalentKeys: string[];
  talentPicks: { warrior: number; expert: number; any: number };
  arts: ClassArtsFields;
  saves: {
    primary: PrioritizedSaveFields;
    secondary: PrioritizedSaveFields;
  };
};

export type { OriginSubtype, GrantsFields };
