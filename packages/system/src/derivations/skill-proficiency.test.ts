import { describe, expect, it } from "vitest";
import { appliedProficiencyBonus } from "./skill-proficiency.ts";

describe("appliedProficiencyBonus", () => {
  it("returns the full tier bonus when specialized", () => {
    expect(appliedProficiencyBonus({ tierBonus: 4, specialized: true })).toBe(4);
    expect(appliedProficiencyBonus({ tierBonus: -2, specialized: true })).toBe(-2);
  });

  it("halves only positive bonuses when unspecialized", () => {
    expect(appliedProficiencyBonus({ tierBonus: 4, specialized: false })).toBe(2);
    expect(appliedProficiencyBonus({ tierBonus: 2, specialized: false })).toBe(1);
    expect(appliedProficiencyBonus({ tierBonus: 0, specialized: false })).toBe(0);
    expect(appliedProficiencyBonus({ tierBonus: -2, specialized: false })).toBe(-2);
  });
});
