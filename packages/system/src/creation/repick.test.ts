import { describe, expect, it } from "vitest";
import { repickLoss, type RepickDraft } from "./repick.ts";

const empty: RepickDraft = {
  cultureKey: null,
  backgroundKey: null,
  classKey: null,
  partialKeys: [],
  hitDieTotal: null,
};

describe("repickLoss", () => {
  it("is false when nothing was chosen after the step", () => {
    expect(repickLoss(empty, "region")).toBe(false);
    expect(repickLoss({ ...empty, cultureKey: "x" }, "culture")).toBe(false);
  });

  it("counts a culture as lost work when the region changes", () => {
    expect(repickLoss({ ...empty, cultureKey: "x" }, "region")).toBe(true);
  });

  it("counts background, class, partials and the HP roll for either level", () => {
    for (const patch of [
      { backgroundKey: "b" },
      { classKey: "c" },
      { partialKeys: ["a", "b"] },
      { hitDieTotal: 4 },
    ]) {
      expect(repickLoss({ ...empty, ...patch }, "region")).toBe(true);
      expect(repickLoss({ ...empty, ...patch }, "culture")).toBe(true);
    }
  });
});
