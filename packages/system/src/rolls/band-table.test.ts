import { describe, expect, it } from "vitest";
import { bandRows } from "./band-table.ts";

describe("bandRows", () => {
  it("labels each band by its total range", () => {
    expect(bandRows().map((r) => r.range)).toEqual(["≤10", "11–15", "16–21", "22–26", "27+"]);
  });

  it("carries the outcome for every difficulty column", () => {
    const [first] = bandRows();
    expect(first?.outcomes.trained).toEqual({ kind: "failure", degree: 1 });
    expect(Object.keys(first?.outcomes ?? {})).toEqual(["easy", "trained", "hard", "legendary"]);
  });
});
