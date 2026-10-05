import { describe, expect, it } from "vitest";
import {
  combineClassOriginsBySlug,
  originSaveProficiencies,
} from "./combine-class-origins.ts";
import {
  fullClassOrigins,
  getClassOrigin,
  partialClassOrigins,
} from "./class-origins.ts";

describe("class origin seeds", () => {
  it("has four Warrior/Expert rows as origin items", () => {
    expect(fullClassOrigins().map((c) => c.system.slug)).toEqual(["warrior", "expert"]);
    expect(partialClassOrigins().map((c) => c.system.slug)).toEqual([
      "warrior-partial",
      "expert-partial",
    ]);
  });

  it("stores class fields on the origin system", () => {
    const warrior = getClassOrigin("warrior");
    expect(warrior?.type).toBe("origin");
    expect(warrior?.system.subType).toBe("class");
    expect(warrior?.system.isFull).toBe(true);
    expect(warrior?.system.hitDie).toBe("1d6+2");
    expect(warrior?.system.hitDiePriority).toBe(1000);
    expect(warrior?.system.saves.primary.save).toBe("reflex");
    expect(warrior?.system.saves.secondary.save).toBe("fortitude");
  });
});

describe("combineClassOriginsBySlug", () => {
  it("takes the higher-priority hit die from partials", () => {
    const combined = combineClassOriginsBySlug("warrior-partial", "expert-partial");
    expect(combined?.hitDie).toBe("1d6+2");
    expect(combined?.names).toEqual(["Warrior", "Expert"]);
  });

  it("on primary collision, keeps that primary and the higher-priority secondary", () => {
    const combined = combineClassOriginsBySlug("warrior-partial", "expert-partial");
    expect(combined?.saves.primary.save).toBe("reflex");
    expect(combined?.saves.secondary.save).toBe("fortitude");
  });

  it("merges talent picks and concatenates class talents", () => {
    const combined = combineClassOriginsBySlug("warrior-partial", "expert-partial");
    expect(combined?.talentPicks).toEqual({ warrior: 1, expert: 1, any: 1 });
    expect(combined?.classTalentKeys).toEqual(["killingBlow", "masterfulExpertise"]);
  });

  it("rejects full-class rows", () => {
    expect(combineClassOriginsBySlug("warrior", "expert-partial")).toBeNull();
    expect(combineClassOriginsBySlug("warrior", "expert")).toBeNull();
  });
});

describe("originSaveProficiencies", () => {
  it("marks primary and secondary trained", () => {
    const warrior = getClassOrigin("warrior")!;
    expect(originSaveProficiencies(warrior.system)).toEqual({
      reflex: "trained",
      fortitude: "trained",
      will: "apprentice",
      luck: "apprentice",
    });
  });
});
