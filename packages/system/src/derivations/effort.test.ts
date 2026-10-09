import { describe, expect, it } from "vitest";
import {
  artHoldsEffort,
  artSlotBudget,
  countCommittedEffort,
  deriveEffortCurrent,
  deriveEffortMax,
  sumSlotsByLevel,
} from "./effort.ts";

describe("deriveEffortMax", () => {
  it("uses max ability mod + floor(max skill prof / 2), min 1", () => {
    expect(
      deriveEffortMax({
        abilityMods: [1, 2],
        skillProficiencyBonuses: [2, 4],
      }),
    ).toBe(2 + Math.floor(4 / 2));
  });

  it("clamps to minimum 1 when mods are low", () => {
    expect(
      deriveEffortMax({
        abilityMods: [-1],
        skillProficiencyBonuses: [0],
      }),
    ).toBe(1);
  });

  it("adds +1 when both Adventurer partials have Effort", () => {
    expect(
      deriveEffortMax({
        abilityMods: [1],
        skillProficiencyBonuses: [2],
        bothPartialsHaveEffort: true,
      }),
    ).toBe(1 + 1 + 1);
  });

  it("treats empty ability/skill lists as 0 then clamps to 1", () => {
    expect(deriveEffortMax({ abilityMods: [], skillProficiencyBonuses: [] })).toBe(1);
  });
});

describe("commits and current", () => {
  it("counts scene/day/concentration but not free", () => {
    expect(
      countCommittedEffort([
        { commitment: "free", effortCommitted: true, concentrating: true },
        { commitment: "scene", effortCommitted: true, concentrating: false },
        { commitment: "day", effortCommitted: true, concentrating: false },
        { commitment: "concentration", effortCommitted: false, concentrating: true },
        { commitment: "scene", effortCommitted: false, concentrating: false },
      ]),
    ).toBe(3);
  });

  it("deriveEffortCurrent subtracts commits", () => {
    expect(
      deriveEffortCurrent(4, [
        { commitment: "scene", effortCommitted: true, concentrating: false },
        { commitment: "day", effortCommitted: true, concentrating: false },
      ]),
    ).toBe(2);
  });

  it("artHoldsEffort matches commitment kind", () => {
    expect(
      artHoldsEffort({ commitment: "concentration", effortCommitted: false, concentrating: true }),
    ).toBe(true);
    expect(
      artHoldsEffort({ commitment: "scene", effortCommitted: false, concentrating: true }),
    ).toBe(false);
  });
});

describe("art slot budget", () => {
  it("sums slots through current level", () => {
    expect(artSlotBudget([1, 1, 0, 1], 3)).toBe(2);
    expect(artSlotBudget([1, 1, 0, 1], 1)).toBe(1);
    expect(artSlotBudget([1, 1], 5)).toBe(2);
  });

  it("sums two progressions per index for Adventurer", () => {
    expect(sumSlotsByLevel([1, 0, 1], [0, 1, 1])).toEqual([
      1, 1, 2, 0, 0, 0, 0, 0, 0, 0,
    ]);
  });
});
