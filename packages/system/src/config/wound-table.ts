/**
 * Wound table: columns = wound count (1–10, then 11+);
 * rows = d20+Luck mod totals (−3 … 30). Cell = effect index.
 */

/** Columns: index 0 unused; 1–10 then index 11 = 11+. */
export const WOUND_TABLE_COLUMNS = 11;

/** Lowest / highest row labels (totals clamp outside this range). */
export const WOUND_TABLE_TOTAL_MIN = -3;
export const WOUND_TABLE_TOTAL_MAX = 30;

/**
 * Rows from worst total (−3) to best (30). Each row is 11 effect indices for columns 1…11+.
 */
export const WOUND_EFFECT_TABLE: ReadonlyArray<ReadonlyArray<number>> = [
  /* -3 */ [20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20],
  /* -2 */ [19, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20],
  /* -1 */ [17, 19, 20, 20, 20, 20, 20, 20, 20, 20, 20],
  /*  0 */ [15, 18, 19, 20, 20, 20, 20, 20, 20, 20, 20],
  /*  1 */ [10, 15, 18, 19, 20, 20, 20, 20, 20, 20, 20],
  /*  2 */ [7, 10, 15, 17, 18, 19, 20, 20, 20, 20, 20],
  /*  3 */ [7, 10, 14, 16, 18, 19, 20, 20, 20, 20, 20],
  /*  4 */ [6, 9, 14, 16, 18, 19, 20, 20, 20, 20, 20],
  /*  5 */ [6, 9, 13, 15, 18, 19, 20, 20, 20, 20, 20],
  /*  6 */ [6, 8, 13, 15, 17, 19, 20, 20, 20, 20, 20],
  /*  7 */ [5, 8, 12, 14, 17, 19, 20, 20, 20, 20, 20],
  /*  8 */ [5, 8, 12, 13, 17, 19, 20, 20, 20, 20, 20],
  /*  9 */ [5, 7, 11, 13, 17, 18, 20, 20, 20, 20, 20],
  /* 10 */ [4, 7, 11, 13, 17, 18, 20, 20, 20, 20, 20],
  /* 11 */ [4, 6, 10, 13, 17, 18, 20, 20, 20, 20, 20],
  /* 12 */ [4, 6, 10, 12, 16, 18, 20, 20, 20, 20, 20],
  /* 13 */ [3, 6, 9, 12, 16, 18, 20, 20, 20, 20, 20],
  /* 14 */ [3, 5, 9, 12, 16, 18, 20, 20, 20, 20, 20],
  /* 15 */ [3, 5, 8, 11, 16, 18, 20, 20, 20, 20, 20],
  /* 16 */ [2, 4, 8, 11, 16, 17, 19, 20, 20, 20, 20],
  /* 17 */ [2, 4, 7, 9, 14, 16, 18, 19, 20, 20, 20],
  /* 18 */ [2, 4, 7, 8, 12, 14, 16, 17, 18, 19, 20],
  /* 19 */ [2, 3, 6, 7, 10, 12, 14, 15, 16, 18, 20],
  /* 20 */ [1, 2, 5, 6, 8, 10, 12, 13, 14, 16, 18],
  /* 21 */ [1, 2, 4, 6, 8, 10, 12, 13, 14, 16, 18],
  /* 22 */ [1, 2, 4, 6, 8, 10, 12, 13, 14, 16, 18],
  /* 23 */ [1, 2, 4, 6, 8, 10, 11, 13, 14, 16, 18],
  /* 24 */ [1, 2, 3, 6, 8, 9, 11, 12, 14, 16, 18],
  /* 25 */ [1, 2, 3, 6, 8, 9, 11, 12, 14, 16, 18],
  /* 26 */ [1, 1, 3, 5, 7, 9, 10, 12, 13, 15, 18],
  /* 27 */ [1, 1, 3, 5, 7, 9, 10, 12, 13, 15, 18],
  /* 28 */ [1, 1, 2, 5, 7, 8, 9, 11, 13, 15, 18],
  /* 29 */ [1, 1, 2, 5, 7, 8, 9, 11, 13, 15, 18],
  /* 30 */ [1, 1, 2, 5, 7, 8, 9, 11, 13, 15, 18],
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
 * Totals below −3 use the −3 row; above 30 use the 30 row.
 */
export function clampWoundTableTotal(total: number): number {
  const t = Math.floor(total);
  if (t <= WOUND_TABLE_TOTAL_MIN) return WOUND_TABLE_TOTAL_MIN;
  if (t >= WOUND_TABLE_TOTAL_MAX) return WOUND_TABLE_TOTAL_MAX;
  return t;
}

export function woundTableRowIndex(total: number): number {
  return clampWoundTableTotal(total) - WOUND_TABLE_TOTAL_MIN;
}

/** Effect index for post-increment wound count and table roll total. */
export function lookupWoundEffectIndex(total: number, woundCount: number): number {
  const row = WOUND_EFFECT_TABLE[woundTableRowIndex(total)];
  const col = woundTableColumnIndex(woundCount);
  return row?.[col] ?? 20;
}

/** Body part from a natural d8 (1–8). */
export function bodyPartFromRoll(d8: number): BodyPartKey {
  const n = Math.min(8, Math.max(1, Math.floor(d8)));
  return BODY_PART_BY_D8[n - 1] ?? "body";
}
