/**
 * Wound table from Kedom RPG.md: columns = wound count (1–10, then 11+);
 * rows = d20+Luck mod bands (20+ … <=1). Cell = effect index.
 */

/** Columns: index 0 unused; 1–10 then index 11 = 11+. */
export const WOUND_TABLE_COLUMNS = 11;

/**
 * Rows from best (20+) to worst (<=1). Each row is 11 effect indices for columns 1…11+.
 */
export const WOUND_EFFECT_TABLE: ReadonlyArray<ReadonlyArray<number>> = [
  /* 20+ */ [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12],
  /* 19  */ [1, 2, 4, 5, 7, 9, 10, 11, 12, 13, 14],
  /* 18  */ [1, 3, 5, 6, 8, 10, 11, 11, 13, 14, 15],
  /* 17  */ [1, 3, 5, 7, 8, 10, 11, 12, 14, 15, 15],
  /* 16  */ [2, 4, 6, 8, 9, 11, 12, 13, 14, 15, 15],
  /* 15  */ [2, 4, 6, 9, 10, 11, 12, 13, 14, 15, 15],
  /* 14  */ [2, 5, 7, 10, 11, 12, 13, 14, 15, 15, 15],
  /* 13  */ [3, 5, 8, 11, 11, 12, 13, 14, 15, 15, 15],
  /* 12  */ [3, 6, 8, 11, 12, 13, 14, 14, 15, 15, 15],
  /* 11  */ [3, 6, 9, 12, 12, 13, 14, 15, 15, 15, 15],
  /* 10  */ [4, 7, 9, 12, 13, 14, 14, 15, 15, 15, 15],
  /* 9   */ [4, 7, 10, 13, 13, 14, 14, 15, 15, 15, 15],
  /* 8   */ [4, 8, 10, 13, 14, 14, 15, 15, 15, 15, 15],
  /* 7   */ [5, 8, 11, 14, 14, 14, 15, 15, 15, 15, 15],
  /* 6   */ [5, 9, 11, 14, 14, 15, 15, 15, 15, 15, 15],
  /* 5   */ [5, 9, 12, 14, 15, 15, 15, 15, 15, 15, 15],
  /* 4   */ [6, 10, 12, 15, 15, 15, 15, 15, 15, 15, 15],
  /* 3   */ [6, 10, 13, 15, 15, 15, 15, 15, 15, 15, 15],
  /* 2   */ [6, 11, 14, 15, 15, 15, 15, 15, 15, 15, 15],
  /* <=1 */ [7, 12, 15, 15, 15, 15, 15, 15, 15, 15, 15],
];

export const BODY_PART_KEYS = [
  "head",
  "rightArm",
  "leftArm",
  "body",
  "rightLeg",
  "leftLeg",
] as const;
export type BodyPartKey = (typeof BODY_PART_KEYS)[number];

/**
 * d8 → body part (1-indexed faces):
 * 1 arm L, 2 arm R, 3 leg L, 4 leg R, 5–7 body, 8 head.
 */
export const BODY_PART_BY_D8: readonly BodyPartKey[] = [
  "leftArm",
  "rightArm",
  "leftLeg",
  "rightLeg",
  "body",
  "body",
  "body",
  "head",
];

/** Column index 0–10 for wound counts 1…10 and 11+. */
export function woundTableColumnIndex(woundCount: number): number {
  const n = Math.max(1, Math.floor(woundCount));
  return Math.min(WOUND_TABLE_COLUMNS, n) - 1;
}

/**
 * Row index into WOUND_EFFECT_TABLE for a d20+Luck total.
 * 20+ → 0, 19 → 1, …, 2 → 18, <=1 → 19.
 */
export function woundTableRowIndex(total: number): number {
  const t = Math.floor(total);
  if (t >= 20) return 0;
  if (t <= 1) return WOUND_EFFECT_TABLE.length - 1;
  return 20 - t;
}

/** Effect index (1–15) for post-increment wound count and table roll total. */
export function lookupWoundEffectIndex(total: number, woundCount: number): number {
  const row = WOUND_EFFECT_TABLE[woundTableRowIndex(total)];
  const col = woundTableColumnIndex(woundCount);
  return row?.[col] ?? 15;
}

/** Body part from a natural d8 (1–8). */
export function bodyPartFromRoll(d8: number): BodyPartKey {
  const n = Math.min(8, Math.max(1, Math.floor(d8)));
  return BODY_PART_BY_D8[n - 1] ?? "body";
}
