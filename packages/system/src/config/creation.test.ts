import { describe, expect, it } from "vitest";
import { getClass, getCulture, resolveTalentPickBudget } from "./creation.ts";

describe("resolveTalentPickBudget", () => {
  it("merges human expert pick with warrior class picks", () => {
    const culture = getCulture("nerland", "human_nerlander");
    const warrior = getClass("warrior");
    expect(resolveTalentPickBudget(culture, warrior)).toEqual({
      warrior: 1,
      expert: 1,
      any: 1,
    });
  });

  it("merges human with adventurer (warrior/expert)", () => {
    const culture = getCulture("nerland", "human_nerlander");
    const adventurer = getClass("adventurer");
    expect(resolveTalentPickBudget(culture, adventurer)).toEqual({
      warrior: 1,
      expert: 2,
      any: 1,
    });
  });

  it("expert class alone has no warrior picks", () => {
    const expert = getClass("expert");
    expect(resolveTalentPickBudget(undefined, expert)).toEqual({
      warrior: 0,
      expert: 1,
      any: 1,
    });
  });
});

describe("CLASSES hit dice and features", () => {
  it("uses Kedom hit dice and features", () => {
    expect(getClass("warrior")?.hitDie).toBe("1d6+2");
    expect(getClass("warrior")?.classFeatures).toEqual([
      "killingBlow",
      "veteransLuck",
      "warriorTalentPicks",
    ]);
    expect(getClass("expert")?.hitDie).toBe("1d6");
    expect(getClass("expert")?.classFeatures).toEqual([
      "masterfulExpertise",
      "expertTalentPicks",
    ]);
    expect(getClass("adventurer")?.hitDie).toBe("1d6");
    expect(getClass("adventurer")?.classFeatures).toEqual([
      "killingBlow",
      "adventurerTalentPicks",
    ]);
    expect(getClass("mage")).toBeUndefined();
  });

  it("sets starting save proficiencies", () => {
    expect(getClass("warrior")?.saveProficiencies).toEqual({
      reflex: "trained",
      fortitude: "trained",
      will: "apprentice",
      luck: "apprentice",
    });
    expect(getClass("expert")?.saveProficiencies).toEqual({
      reflex: "trained",
      fortitude: "apprentice",
      will: "apprentice",
      luck: "trained",
    });
    expect(getClass("adventurer")?.saveProficiencies).toEqual({
      reflex: "trained",
      fortitude: "trained",
      will: "apprentice",
      luck: "apprentice",
    });
  });
});
