import { describe, expect, it } from "vitest";
import {
  artActiveUses,
  artHoldsEffort,
  artSlotBudget,
  countCommittedEffort,
  deriveEffortCurrent,
  deriveEffortMax,
  sumSlotsByLevel,
} from "./effort.ts";

describe("deriveEffortMax", () => {
  it("uses max ability mod + floor(max skill tier bonus / 2), min 1", () => {
    expect(
      deriveEffortMax({
        abilityMods: [1, 2],
        skillProficiencyBonuses: [2, 4],
      }),
    ).toBe(2 + Math.floor(4 / 2));
  });

  it("Mystagogue-style: kno +1, trained worship +2 → Effort 2", () => {
    expect(
      deriveEffortMax({
        abilityMods: [1, 1], // kno 15, pre 14
        skillProficiencyBonuses: [2], // trained tier, not halved check bonus
      }),
    ).toBe(2);
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
  it("sums activeUses per art; free never counts", () => {
    expect(
      countCommittedEffort([
        { commitment: "free", activeUses: 5 },
        { commitment: "scene", activeUses: 2 },
        { commitment: "day", activeUses: 1 },
        { commitment: "concentration", activeUses: 3 },
        { commitment: "scene", activeUses: 0 },
      ]),
    ).toBe(6);
  });

  it("deriveEffortCurrent subtracts stacked uses", () => {
    expect(
      deriveEffortCurrent(4, [
        { commitment: "scene", activeUses: 2 },
        { commitment: "day", activeUses: 1 },
      ]),
    ).toBe(1);
  });

  it("artActiveUses / artHoldsEffort ignore free and floor counts", () => {
    expect(artActiveUses({ commitment: "free", activeUses: 9 })).toBe(0);
    expect(artActiveUses({ commitment: "scene", activeUses: 2.7 })).toBe(2);
    expect(artHoldsEffort({ commitment: "concentration", activeUses: 1 })).toBe(true);
    expect(artHoldsEffort({ commitment: "scene", activeUses: 0 })).toBe(false);
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
