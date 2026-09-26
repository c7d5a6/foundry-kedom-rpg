export const TALENT_CATEGORIES = ["warrior", "expert", "any", "class", "race"] as const;
export type TalentCategory = (typeof TALENT_CATEGORIES)[number];
