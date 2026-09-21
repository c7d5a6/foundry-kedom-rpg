import { ABILITY_MOD_BANDS } from "../config/kedom.ts";

/** Pure: ability score (+ optional baseMod) → modifier on the −3…+3 table. */
export function abilityModifier(score: number, baseMod = 0): number {
  const total = Math.min(18, Math.max(3, Math.floor(score)));
  for (const band of ABILITY_MOD_BANDS) {
    if (total <= band.max) return band.mod + baseMod;
  }
  return 3 + baseMod;
}
