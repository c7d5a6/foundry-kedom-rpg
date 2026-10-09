import { describe, expect, it } from "vitest";
import type { OriginDataFields } from "../data/item/origin-fields.ts";
import { combineClassOrigins, originSaveProficiencies } from "./combine-class-origins.ts";

function partial(
  overrides: Partial<OriginDataFields> & Pick<OriginDataFields, "slug">,
): OriginDataFields {
  return {
    subType: "class",
    description: "",
    grants: { skills: [], specializations: [], abilities: [] },
    cultures: [],
    talentSlug: "",
    classSlugs: [],
    free: { skillKey: "", specSlug: "" },
    growth: [],
    isFull: false,
    hitDie: "1d6",
    hitDiePriority: 0,
    classTalentKeys: [],
    talentPicks: { warrior: 0, expert: 0, any: 0 },
    arts: { skillKey: "", abilityKeys: [], receiveTableKey: "", artKeys: [] },
    saves: {
      primary: { save: "reflex", priority: 0 },
      secondary: { save: "fortitude", priority: 0 },
    },
    bannerImg: "",
    ...overrides,
  };
}

describe("combineClassOrigins", () => {
  const warrior = partial({
    slug: "warrior-partial",
    hitDie: "1d6+2",
    hitDiePriority: 1000,
    talentPicks: { warrior: 1, expert: 0, any: 0 },
    saves: {
      primary: { save: "reflex", priority: 1000 },
      secondary: { save: "fortitude", priority: 100 },
    },
  });
  const expert = partial({
    slug: "expert-partial",
    hitDie: "1d6",
    hitDiePriority: 500,
    talentPicks: { warrior: 0, expert: 1, any: 1 },
    saves: {
      primary: { save: "reflex", priority: 500 },
      secondary: { save: "luck", priority: 200 },
    },
  });

  it("takes the higher-priority hit die", () => {
    const combined = combineClassOrigins(warrior, "Warrior", expert, "Expert");
    expect(combined?.hitDie).toBe("1d6+2");
    expect(combined?.names).toEqual(["Warrior", "Expert"]);
  });

  it("on primary collision, keeps that primary and the higher-priority secondary", () => {
    const combined = combineClassOrigins(warrior, "Warrior", expert, "Expert");
    expect(combined?.saves.primary.save).toBe("reflex");
    expect(combined?.saves.secondary.save).toBe("luck");
  });

  it("merges talent picks and concatenates class talents", () => {
    const combined = combineClassOrigins(warrior, "Warrior", expert, "Expert");
    expect(combined?.talentPicks).toEqual({ warrior: 1, expert: 1, any: 1 });
    expect(combined?.classTalentKeys).toEqual([]);
  });

  it("rejects full-class rows", () => {
    expect(
      combineClassOrigins({ ...warrior, isFull: true }, "Warrior", expert, "Expert"),
    ).toBeNull();
  });
});

describe("originSaveProficiencies", () => {
  it("marks primary and secondary trained", () => {
    const system = partial({ slug: "warrior" });
    expect(originSaveProficiencies(system)).toEqual({
      reflex: "trained",
      fortitude: "trained",
      will: "apprentice",
      luck: "apprentice",
    });
  });
});
