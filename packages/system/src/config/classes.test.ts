import { describe, expect, it } from "vitest";
import {
  CLASS_KEYS,
  assertClassRosterComplete,
  combinePartials,
  fullClasses,
  getClassEntry,
  partialClasses,
} from "./classes.ts";

describe("CLASSES roster", () => {
  it("has every CLASS_KEYS member", () => {
    expect(() => assertClassRosterComplete()).not.toThrow();
    expect(CLASS_KEYS).toHaveLength(4);
  });

  it("treats full and partial as separate rows", () => {
    expect(fullClasses().map((c) => c.key)).toEqual(["warrior", "expert"]);
    expect(partialClasses().map((c) => c.key)).toEqual([
      "warriorPartial",
      "expertPartial",
    ]);
    expect(getClassEntry("warrior")?.isFull).toBe(true);
    expect(getClassEntry("warriorPartial")?.isFull).toBe(false);
  });

  it("shares display titles across full/partial of a family", () => {
    expect(getClassEntry("warrior")?.labelKey).toBe("KEDOM.Class.warrior");
    expect(getClassEntry("warriorPartial")?.labelKey).toBe("KEDOM.Class.warrior");
  });

  it("requires hit die, talents, and saves on every row", () => {
    for (const entry of [getClassEntry("warrior"), getClassEntry("expertPartial")]) {
      expect(entry?.hitDie.formula).toBeTruthy();
      expect(entry?.classTalentKeys.length).toBeGreaterThan(0);
      expect(entry?.saves.primary.save).toBeTruthy();
      expect(entry?.saves.secondary.save).toBeTruthy();
    }
  });
});

describe("combinePartials", () => {
  it("takes the higher-priority hit die from partials", () => {
    const combined = combinePartials("warriorPartial", "expertPartial");
    expect(combined?.hitDie.formula).toBe("1d6+2");
    expect(combined?.labelKeys).toEqual(["KEDOM.Class.warrior", "KEDOM.Class.expert"]);
  });

  it("on primary collision, keeps that primary and the higher-priority secondary", () => {
    const combined = combinePartials("warriorPartial", "expertPartial");
    // Both primaries are reflex; warrior secondary (fortitude) outranks expert (luck).
    expect(combined?.saves.primary.save).toBe("reflex");
    expect(combined?.saves.secondary.save).toBe("fortitude");
  });

  it("merges talent pick budgets and concatenates class talents", () => {
    const combined = combinePartials("warriorPartial", "expertPartial");
    expect(combined?.talentPicks).toEqual({ warrior: 1, expert: 1, any: 1 });
    expect(combined?.classTalentKeys).toEqual(["killingBlow", "masterfulExpertise"]);
  });

  it("rejects full-class rows", () => {
    expect(combinePartials("warrior", "expertPartial")).toBeNull();
    expect(combinePartials("warrior", "expert")).toBeNull();
  });
});
