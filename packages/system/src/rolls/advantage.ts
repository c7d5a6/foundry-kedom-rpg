/** Skill/save check dice from signed advantage net (extra d10s). */

const DEFAULT_SKILL_BASE_DICE = 2;

function normalizeBaseDice(baseDice: number): number {
  const base = Math.trunc(baseDice);
  return base >= 1 ? base : DEFAULT_SKILL_BASE_DICE;
}

/**
 * @param net `0` = straight Nd10; positive = keep highest N; negative = keep lowest N
 * @param baseDice dice kept (default 2 → classic 2d10 / kh2 / kl2)
 */
export function skillCheckDiceTerm(net: number, baseDice = DEFAULT_SKILL_BASE_DICE): string {
  const n = Math.trunc(net);
  const base = normalizeBaseDice(baseDice);
  if (n === 0) return `${String(base)}d10`;
  if (n > 0) return `${String(base + n)}d10kh${String(base)}`;
  return `${String(base + Math.abs(n))}d10kl${String(base)}`;
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
