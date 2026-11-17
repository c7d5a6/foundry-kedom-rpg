import { PROFICIENCY_TIERS, type ProficiencyTier } from "../../../../config/kedom.ts";

let collator: Intl.Collator | null = null;
let collatorLang = "";

/** Locale-aware compare with one cached `Intl.Collator` (per-call `localeCompare` rebuilds it). */
export function collate(a: string, b: string): number {
  const lang = game.i18n.lang;
  if (collator === null || collatorLang !== lang) {
    collator = new Intl.Collator(lang);
    collatorLang = lang;
  }
  return collator.compare(a, b);
}

export function proficiencyLetterFromLabel(tier: ProficiencyTier): string {
  const label = game.i18n.localize(`KEDOM.Proficiency.${tier}`);
  const first = Array.from(label)[0] ?? "";
  return first.toLocaleUpperCase(game.i18n.lang);
}

export type TierOption = {
  value: ProficiencyTier;
  label: string;
  letter: string;
  rankClass: string;
};

/** Localised proficiency options, built once per render and shared by every skill and save. */
export function buildTierOptions(): TierOption[] {
  return PROFICIENCY_TIERS.map((value) => ({
    value,
    label: game.i18n.localize(`KEDOM.Proficiency.${value}`),
    letter: proficiencyLetterFromLabel(value),
    rankClass: `kedom-skill--${value}`,
  }));
}
