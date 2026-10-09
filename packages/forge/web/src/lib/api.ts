export type TranslationMap = Partial<Record<"label" | "abbreviation" | "description", string>>;

export type VocabKind =
  | "proficiency"
  | "outcome"
  | "save"
  | "difficulty"
  | "derived"
  | "condition"
  | "injury_severity"
  | "injury_location"
  | "injury_weapon";

export type EntityKind =
  | "attribute"
  | "skill"
  | "specialization"
  | "class"
  | "race"
  | "region"
  | "background"
  | "talent"
  | VocabKind;

export const VOCAB_KINDS: { kind: VocabKind; label: string }[] = [
  { kind: "proficiency", label: "Proficiency" },
  { kind: "outcome", label: "Outcome" },
  { kind: "save", label: "Save" },
  { kind: "difficulty", label: "Difficulty" },
  { kind: "derived", label: "Derived stats" },
  { kind: "condition", label: "Condition" },
  { kind: "injury_severity", label: "Injury severity" },
  { kind: "injury_location", label: "Injury location" },
  { kind: "injury_weapon", label: "Injury weapon" },
];

export type Attribute = {
  id: number;
  slug: string;
  label: string;
  abbreviation: string;
  description: string;
  comment: string;
  sort_order: number;
  translations: TranslationMap;
};

export type Skill = {
  id: number;
  slug: string;
  label: string;
  description: string;
  comment: string;
  attribute_id: number;
  attribute_slug: string;
  specialization_mode: string;
  is_secondary: boolean;
  sort_order: number;
  foundry_id: string;
  translations: TranslationMap;
};

export type Specialization = {
  id: number;
  slug: string;
  label: string;
  description: string;
  comment: string;
  skill_id: number;
  skill_slug: string;
  parameter: string | null;
  sort_order: number;
  foundry_id: string;
  translations: TranslationMap;
};

export type EntityRef = { id: number; slug: string; label: string };

export const TALENT_CATEGORIES = [
  "class",
  "culture",
  "skills",
  "combat",
  "general",
  "other",
] as const;
export type TalentCategory = (typeof TALENT_CATEGORIES)[number];

/** Hit die formulas used by class origins (OSR-style). */
export const HIT_DIE_OPTIONS = [
  "1d4",
  "1d6",
  "1d6+1",
  "1d6+2",
  "1d8",
  "1d10",
  "1d12",
] as const;

export type ClassRow = {
  id: number;
  slug: string;
  label: string;
  description: string;
  comment: string;
  is_full: boolean;
  is_partial: boolean;
  hit_die: string;
  talent_id: number | null;
  talent_slug: string;
  hit_die_priority: number;
  talent_picks_warrior: number;
  talent_picks_expert: number;
  talent_picks_any: number;
  save_primary: string;
  save_primary_priority: number;
  save_secondary: string;
  save_secondary_priority: number;
  arts_skill_key: string;
  sort_order: number;
  foundry_id: string;
  linked_cultures: EntityRef[];
  translations: TranslationMap;
};

export type Talent = {
  id: number;
  slug: string;
  label: string;
  description: string;
  comment: string;
  category: string;
  grants_json: string;
  effects_json: string;
  sort_order: number;
  foundry_id: string;
  linked_cultures: EntityRef[];
  linked_classes: EntityRef[];
  translations: TranslationMap;
};

export type RaceClassLink = {
  class_id: number;
  class_slug: string;
  class_label: string;
  is_prefilled_slot: boolean;
};

/** Culture in UI — race table in API. */
export type RaceRegionLink = {
  region_id: number;
  region_slug: string;
  region_label: string;
  weight: number;
};

export type RaceBackgroundUse = {
  region_id: number;
  region_slug: string;
  region_label: string;
  background_id: number;
  background_slug: string;
  background_label: string;
  sort_order: number;
};

export type Race = {
  id: number;
  slug: string;
  label: string;
  description: string;
  comment: string;
  parent_race_id: number | null;
  talent_id: number | null;
  talent_slug: string;
  sort_order: number;
  foundry_id: string;
  classes: RaceClassLink[];
  linked_regions: RaceRegionLink[];
  linked_backgrounds: RaceBackgroundUse[];
  translations: TranslationMap;
};

export type RegionCultureLink = {
  race_id: number;
  race_slug: string;
  race_label: string;
  weight: number;
};

export type RegionBackgroundLink = {
  race_id: number;
  race_slug: string;
  background_id: number;
  background_slug: string;
  background_label: string;
  sort_order: number;
};

export type Region = {
  id: number;
  slug: string;
  label: string;
  description: string;
  comment: string;
  sort_order: number;
  foundry_id: string;
  banner_img: string;
  cultures: RegionCultureLink[];
  backgrounds: RegionBackgroundLink[];
  translations: TranslationMap;
};

export type GrantKind = "skill" | "anyCombat" | "anySkill";

export type GrowthRow = {
  roll_index: number;
  grant_kind: GrantKind | string;
  skill_id: number | null;
  skill_slug: string;
  specialization_id: number | null;
  specialization_slug: string;
  specialization_label: string;
};

export type BackgroundUseLink = {
  region_id: number;
  region_slug: string;
  region_label: string;
  race_id: number;
  race_slug: string;
  race_label: string;
  sort_order: number;
};

export type Background = {
  id: number;
  slug: string;
  label: string;
  description: string;
  comment: string;
  free_grant_kind: GrantKind | string;
  free_skill_id: number | null;
  free_skill_slug: string;
  free_specialization_id: number | null;
  free_specialization_slug: string;
  free_specialization_label: string;
  sort_order: number;
  foundry_id: string;
  growth: GrowthRow[];
  used_by: BackgroundUseLink[];
  translations: TranslationMap;
};

export type Vocab = {
  id: number;
  kind: VocabKind;
  slug: string;
  label: string;
  abbreviation: string;
  sort_order: number;
  comment: string;
  translations: TranslationMap;
};

export type CompletenessItem = {
  entity_kind: string;
  entity_id: number;
  slug: string;
  label: string;
  missing: string[];
};

export type TranslationField = "label" | "abbreviation" | "description";

export type CreateTalentBody = {
  label: string;
  description?: string;
  comment?: string;
  category?: string;
  grants_json?: string;
  sort_order?: number;
};

export type UpdateTalentBody = {
  label: string;
  description: string;
  comment: string;
  category: string;
  grants_json: string;
  effects_json: string;
  sort_order: number;
};

export type CreateRaceBody = {
  label: string;
  description?: string;
  comment?: string;
  parent_race_id?: number | null;
  talent_id?: number | null;
  sort_order?: number;
  class_ids?: number[];
};

export type UpdateRaceBody = {
  label: string;
  description: string;
  comment: string;
  parent_race_id: number | null;
  talent_id: number | null;
  sort_order: number;
  class_ids: number[];
};

export type RegionCultureIn = { race_id: number; weight: number };
export type RegionBackgroundIn = {
  race_id: number;
  background_id: number;
  sort_order: number;
};

export type CreateRegionBody = {
  label: string;
  description?: string;
  comment?: string;
  sort_order?: number;
  banner_img?: string;
  cultures?: RegionCultureIn[];
  backgrounds?: RegionBackgroundIn[];
};

export type UpdateRegionBody = {
  label: string;
  description: string;
  comment: string;
  sort_order: number;
  banner_img: string;
  cultures: RegionCultureIn[];
  backgrounds: RegionBackgroundIn[];
};

export type GrowthRowIn = {
  roll_index: number;
  grant_kind: GrantKind | string;
  skill_id?: number | null;
  specialization_id?: number | null;
  specialization_label?: string;
};

export type CreateBackgroundBody = {
  label: string;
  description?: string;
  comment?: string;
  free_grant_kind?: GrantKind | string;
  free_skill_id?: number | null;
  free_specialization_id?: number | null;
  free_specialization_label?: string;
  sort_order?: number;
  growth: GrowthRowIn[];
};

export type UpdateBackgroundBody = {
  label: string;
  description: string;
  comment: string;
  free_grant_kind: GrantKind | string;
  free_skill_id: number | null;
  free_specialization_id: number | null;
  free_specialization_label: string;
  sort_order: number;
  growth: GrowthRowIn[];
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) msg = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

const localeQ = "locale=ru";

export const api = {
  attributes: () => request<Attribute[]>(`/api/attributes?${localeQ}`),
  attribute: (id: number) => request<Attribute>(`/api/attributes/${id}?${localeQ}`),
  patchAttribute: (id: number, body: object) =>
    request<Attribute>(`/api/attributes/${id}?${localeQ}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  skills: () => request<Skill[]>(`/api/skills?${localeQ}`),
  skill: (id: number) => request<Skill>(`/api/skills/${id}?${localeQ}`),
  patchSkill: (id: number, body: object) =>
    request<Skill>(`/api/skills/${id}?${localeQ}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  skillSpecs: (id: number) =>
    request<Specialization[]>(`/api/skills/${id}/specializations?${localeQ}`),

  specialization: (id: number) => request<Specialization>(`/api/specializations/${id}?${localeQ}`),
  patchSpecialization: (id: number, body: object) =>
    request<Specialization>(`/api/specializations/${id}?${localeQ}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  classes: () => request<ClassRow[]>(`/api/classes?${localeQ}`),
  class: (id: number) => request<ClassRow>(`/api/classes/${id}?${localeQ}`),
  createClass: (body: {
    label: string;
    is_full?: boolean;
    is_partial?: boolean;
    hit_die?: string;
  }) =>
    request<ClassRow>(`/api/classes?${localeQ}`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  patchClass: (id: number, body: object) =>
    request<ClassRow>(`/api/classes/${id}?${localeQ}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteClass: (id: number) =>
    request<{ status: string }>(`/api/classes/${id}`, { method: "DELETE" }),

  talents: () => request<Talent[]>(`/api/talents?${localeQ}`),
  talent: (id: number) => request<Talent>(`/api/talents/${id}?${localeQ}`),
  createTalent: (body: CreateTalentBody) =>
    request<Talent>(`/api/talents?${localeQ}`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  patchTalent: (id: number, body: UpdateTalentBody) =>
    request<Talent>(`/api/talents/${id}?${localeQ}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteTalent: (id: number) =>
    request<{ status: string }>(`/api/talents/${id}`, { method: "DELETE" }),

  races: () => request<Race[]>(`/api/races?${localeQ}`),
  race: (id: number) => request<Race>(`/api/races/${id}?${localeQ}`),
  createRace: (body: CreateRaceBody) =>
    request<Race>(`/api/races?${localeQ}`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  patchRace: (id: number, body: UpdateRaceBody) =>
    request<Race>(`/api/races/${id}?${localeQ}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteRace: (id: number) => request<{ status: string }>(`/api/races/${id}`, { method: "DELETE" }),

  regions: () => request<Region[]>(`/api/regions?${localeQ}`),
  region: (id: number) => request<Region>(`/api/regions/${id}?${localeQ}`),
  createRegion: (body: CreateRegionBody) =>
    request<Region>(`/api/regions?${localeQ}`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  patchRegion: (id: number, body: UpdateRegionBody) =>
    request<Region>(`/api/regions/${id}?${localeQ}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteRegion: (id: number) =>
    request<{ status: string }>(`/api/regions/${id}`, { method: "DELETE" }),

  backgrounds: () => request<Background[]>(`/api/backgrounds?${localeQ}`),
  background: (id: number) => request<Background>(`/api/backgrounds/${id}?${localeQ}`),
  createBackground: (body: CreateBackgroundBody) =>
    request<Background>(`/api/backgrounds?${localeQ}`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  patchBackground: (id: number, body: UpdateBackgroundBody) =>
    request<Background>(`/api/backgrounds/${id}?${localeQ}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteBackground: (id: number) =>
    request<{ status: string }>(`/api/backgrounds/${id}`, { method: "DELETE" }),

  vocab: (kind?: VocabKind) => {
    const q = kind ? `?${localeQ}&kind=${kind}` : `?${localeQ}`;
    return request<Vocab[]>(`/api/vocab${q}`);
  },
  patchVocab: (id: number, body: object) =>
    request<Vocab>(`/api/vocab/${id}?${localeQ}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  putTranslation: (body: {
    entity_kind: EntityKind;
    entity_id: number;
    locale: string;
    field: TranslationField;
    value: string;
  }) =>
    request<{ status: string }>("/api/translations", {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  deleteTranslation: (q: {
    entity_kind: EntityKind;
    entity_id: number;
    locale: string;
    field: TranslationField;
  }) => {
    const params = new URLSearchParams({
      entity_kind: q.entity_kind,
      entity_id: String(q.entity_id),
      locale: q.locale,
      field: q.field,
    });
    return request<void>(`/api/translations?${params}`, { method: "DELETE" });
  },

  completeness: () => request<CompletenessItem[]>(`/api/completeness?${localeQ}`),

  exportMarkdown: async (locale: "en" | "ru" = "en") => {
    const res = await fetch(`/api/export/markdown?locale=${locale}`);
    if (!res.ok) {
      let msg = res.statusText;
      try {
        const body = (await res.json()) as { error?: string };
        if (body.error) msg = body.error;
      } catch {
        /* ignore */
      }
      throw new Error(msg);
    }
    return res.text();
  },
};
