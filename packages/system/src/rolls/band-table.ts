import { OUTCOME_BANDS, type DifficultyColumn, type GradedOutcome } from "../config/kedom.ts";

export interface BandRow {
  /** Total range, e.g. "≤10", "11–15", "27+". */
  range: string;
  outcomes: Record<DifficultyColumn, GradedOutcome>;
}

/** The outcome ladder as table rows, so a dialog can show what each total means. */
export function bandRows(): BandRow[] {
  const rows: BandRow[] = [];
  let previousMax: number | null = null;
  for (const band of OUTCOME_BANDS) {
    const min = previousMax === null ? null : previousMax + 1;
    let range: string;
    if (band.max === null) range = `${String(min ?? 0)}+`;
    else if (min === null) range = `≤${String(band.max)}`;
    else range = `${String(min)}–${String(band.max)}`;
    rows.push({
      range,
      outcomes: {
        easy: band.easy,
        trained: band.trained,
        hard: band.hard,
        legendary: band.legendary,
      },
    });
    previousMax = band.max;
  }
  return rows;
}
