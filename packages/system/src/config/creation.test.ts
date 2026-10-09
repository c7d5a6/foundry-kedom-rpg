import { describe, expect, it } from "vitest";
import type { OriginDataFields } from "../data/item/origin-fields.ts";
import {
  classDefFromOriginFields,
  getCulture,
  resolveTalentPickBudget,
  type ClassDef,
} from "./creation.ts";

const warrior: ClassDef = {
  key: "warrior",
  labelKey: "",
  hitDie: "1d6",
  talentPicks: { warrior: 1, any: 1 },
  saveProficiencies: {
    reflex: "trained",
    fortitude: "trained",
    will: "apprentice",
    luck: "apprentice",
  },
};

const hybrid: ClassDef = {
  key: "hybrid",
  labelKey: "",
  hitDie: "1d6",
  talentPicks: { warrior: 1, expert: 1, any: 1 },
  saveProficiencies: warrior.saveProficiencies,
};

function classOrigin(
  overrides: Partial<OriginDataFields> & Pick<OriginDataFields, "slug">,
): OriginDataFields {
  return {
    subType: "class",
    description: "",
    grants: { skills: [], specializations: [], abilities: [] },
    cultures: [],
    talentSlug: "",
    talentSlugs: [],
    classSlugs: [],
    free: { skillKey: "", specSlug: "" },
    growth: [],
    isFull: true,
    hitDie: "1d6",
    hitDiePriority: 0,
    talentPicks: { warrior: 0, expert: 0, any: 0 },
    arts: {
      skillKey: "",
      abilityKeys: [],
      slotsByLevel: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      receiveTableKey: "",
      artKeys: [],
    },
    saves: {
      primary: { save: "reflex", priority: 0 },
      secondary: { save: "fortitude", priority: 0 },
    },
    bannerImg: "",
    ...overrides,
  };
}

describe("resolveTalentPickBudget", () => {
  it("merges culture picks with class picks", () => {
    const culture = getCulture("nerland", "human_nerlander");
    expect(resolveTalentPickBudget(culture, warrior)).toEqual({
      warrior: 1,
      expert: 1,
      any: 1,
    });
  });

  it("adds culture expert picks onto a class that already has an expert pick", () => {
    const culture = getCulture("nerland", "human_nerlander");
    expect(resolveTalentPickBudget(culture, hybrid)).toEqual({
      warrior: 1,
      expert: 2,
      any: 1,
    });
  });

  it("keeps class picks when there is no culture", () => {
    expect(resolveTalentPickBudget(undefined, hybrid)).toEqual({
      warrior: 1,
      expert: 1,
      any: 1,
    });
  });
});

describe("classDefFromOriginFields", () => {
  it("copies hit die, picks, and trained saves from the origin", () => {
    const def = classDefFromOriginFields(
      classOrigin({
        slug: "duelist",
        hitDie: "1d6+2",
        talentPicks: { warrior: 2, expert: 0, any: 1 },
        saves: {
          primary: { save: "reflex", priority: 10 },
          secondary: { save: "luck", priority: 5 },
        },
      }),
    );
    expect(def.key).toBe("duelist");
    expect(def.hitDie).toBe("1d6+2");
    expect(def.talentPicks).toEqual({ warrior: 2, any: 1 });
    expect(def.saveProficiencies).toEqual({
      reflex: "trained",
      fortitude: "apprentice",
      will: "apprentice",
      luck: "trained",
    });
  });
});
