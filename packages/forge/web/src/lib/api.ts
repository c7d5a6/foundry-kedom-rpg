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

export type EntityKind = "attribute" | "skill" | "specialization" | "class" | VocabKind;

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

export type ClassRow = {
  id: number;
  slug: string;
  label: string;
  description: string;
  comment: string;
  is_full: boolean;
  is_partial: boolean;
  sort_order: number;
  foundry_id: string;
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

export const api = {
  attributes: () => request<Attribute[]>("/api/attributes?locale=ru"),
  attribute: (id: number) => request<Attribute>(`/api/attributes/${id}?locale=ru`),
  patchAttribute: (id: number, body: object) =>
    request<Attribute>(`/api/attributes/${id}?locale=ru`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  skills: () => request<Skill[]>("/api/skills?locale=ru"),
  skill: (id: number) => request<Skill>(`/api/skills/${id}?locale=ru`),
  patchSkill: (id: number, body: object) =>
    request<Skill>(`/api/skills/${id}?locale=ru`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  skillSpecs: (id: number) =>
    request<Specialization[]>(`/api/skills/${id}/specializations?locale=ru`),

  specialization: (id: number) =>
    request<Specialization>(`/api/specializations/${id}?locale=ru`),
  patchSpecialization: (id: number, body: object) =>
    request<Specialization>(`/api/specializations/${id}?locale=ru`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  classes: () => request<ClassRow[]>("/api/classes?locale=ru"),
  class: (id: number) => request<ClassRow>(`/api/classes/${id}?locale=ru`),
  patchClass: (id: number, body: object) =>
    request<ClassRow>(`/api/classes/${id}?locale=ru`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  vocab: (kind?: VocabKind) => {
    const q = kind ? `?locale=ru&kind=${kind}` : "?locale=ru";
    return request<Vocab[]>(`/api/vocab${q}`);
  },
  patchVocab: (id: number, body: object) =>
    request<Vocab>(`/api/vocab/${id}?locale=ru`, {
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

  completeness: () => request<CompletenessItem[]>("/api/completeness?locale=ru"),

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
