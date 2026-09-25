/** Skill/save check dice from signed advantage net (extra d10s). */

/**
 * @param net `0` = straight 2d10; positive = keep highest 2; negative = keep lowest 2
 */
export function skillCheckDiceTerm(net: number): string {
  const n = Math.trunc(net);
  if (n === 0) return "2d10";
  if (n > 0) return `${String(2 + n)}d10kh2`;
  return `${String(2 + Math.abs(n))}d10kl2`;
}

/**
 * Luck save die from signed advantage net (extra d20s).
 * @param net `0` = `1d20`; positive = keep highest 1; negative = keep lowest 1
 */
export function luckSaveDiceTerm(net: number): string {
  const n = Math.trunc(net);
  if (n === 0) return "1d20";
  if (n > 0) return `${String(1 + n)}d20kh1`;
  return `${String(1 + Math.abs(n))}d20kl1`;
}
