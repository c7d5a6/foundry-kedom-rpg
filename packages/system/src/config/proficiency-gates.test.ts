import { describe, expect, it } from "vitest";
import {
  canRaiseTo,
  clampProficiencyToLevel,
  maxProficiencyForLevel,
  minLevelForProficiency,
} from "./proficiency-gates.ts";

describe("proficiency-gates", () => {
  it("minLevelForProficiency matches the rules table", () => {
    expect(minLevelForProficiency("apprentice")).toBe(1);
    expect(minLevelForProficiency("trained")).toBe(1);
    expect(minLevelForProficiency("expert")).toBe(3);
    expect(minLevelForProficiency("master")).toBe(6);
    expect(minLevelForProficiency("legendary")).toBe(9);
  });

  it("maxProficiencyForLevel respects gates", () => {
    expect(maxProficiencyForLevel(1)).toBe("trained");
    expect(maxProficiencyForLevel(2)).toBe("trained");
    expect(maxProficiencyForLevel(3)).toBe("expert");
    expect(maxProficiencyForLevel(5)).toBe("expert");
    expect(maxProficiencyForLevel(6)).toBe("master");
    expect(maxProficiencyForLevel(9)).toBe("legendary");
  });

  it("canRaiseTo blocks already-at-or-above and level gates", () => {
    expect(canRaiseTo("untrained", "apprentice", 1)).toBe(true);
    expect(canRaiseTo("apprentice", "apprentice", 1)).toBe(false);
    expect(canRaiseTo("trained", "apprentice", 1)).toBe(false);
    expect(canRaiseTo("trained", "expert", 1)).toBe(false);
    expect(canRaiseTo("trained", "expert", 3)).toBe(true);
    expect(canRaiseTo("expert", "master", 5)).toBe(false);
    expect(canRaiseTo("expert", "master", 6)).toBe(true);
  });

  it("clampProficiencyToLevel caps high tiers", () => {
    expect(clampProficiencyToLevel("legendary", 1)).toBe("trained");
    expect(clampProficiencyToLevel("expert", 3)).toBe("expert");
    expect(clampProficiencyToLevel("apprentice", 9)).toBe("apprentice");
  });
});
