import { ABILITY_MOD_BANDS, LUCK_SCORE_MAX, LUCK_SCORE_MIN } from "../config/kedom.ts";

/** Pure: ability score (+ optional baseMod) → modifier on the −3…+3 table. */
export function abilityModifier(score: number, baseMod = 0): number {
  const total = Math.min(LUCK_SCORE_MAX, Math.max(LUCK_SCORE_MIN, Math.floor(score)));
  for (const band of ABILITY_MOD_BANDS) {
    if (total <= band.max) return band.mod + baseMod;
  }
  return 3 + baseMod;
}
