/** The slice of the wizard draft that later steps build on. */
export interface RepickDraft {
  cultureKey: string | null;
  backgroundKey: string | null;
  classKey: string | null;
  partialKeys: readonly string[];
  hitDieTotal: number | null;
}

/**
 * True when changing the region (or culture) would throw away choices made after it.
 * Picking the already-selected value changes nothing, so callers skip the reset before asking.
 */
export function repickLoss(draft: RepickDraft, level: "region" | "culture"): boolean {
  const afterCulture =
    draft.backgroundKey !== null ||
    draft.classKey !== null ||
    draft.partialKeys.length > 0 ||
    draft.hitDieTotal !== null;
  return level === "region" ? draft.cultureKey !== null || afterCulture : afterCulture;
}
