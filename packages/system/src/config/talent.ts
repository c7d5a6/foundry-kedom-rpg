export const TALENT_CATEGORIES = [
  "class",
  "culture",
  "skills",
  "combat",
  "general",
  "other",
] as const;
export type TalentCategory = (typeof TALENT_CATEGORIES)[number];
