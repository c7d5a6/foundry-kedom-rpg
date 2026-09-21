import { describe, expect, it } from "vitest";
import { modifierTooltipParts } from "./skill-check.ts";

describe("modifierTooltipParts", () => {
  it("formats signed formulas and keeps Foundry-style flavor labels", () => {
    expect(
      modifierTooltipParts([
        { label: "Focus", value: 2 },
        { label: "Trained", value: 2 },
        { label: "Armor", value: -1 },
      ]),
    ).toEqual([
      { formula: "+2", flavor: "Focus", total: 2 },
      { formula: "+2", flavor: "Trained", total: 2 },
      { formula: "-1", flavor: "Armor", total: -1 },
    ]);
  });
});
